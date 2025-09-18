#!/usr/bin/env node
/**
 * check-wiki-links.js
 * Simple link checker for local wiki markdown files.
 * - Validates that local wiki/doc links resolve to files on disk
 * - Optional external link checking with --external (HTTP HEAD)
 *
 * Usage:
 *   node scripts/check-wiki-links.js [--external]
 */

const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const repoRoot = path.resolve(__dirname, '..');
const wikiRoot = path.join(repoRoot, 'wiki');

const argv = process.argv.slice(2);
const checkExternal = argv.includes('--external');

function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdownFiles(p));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

function extractLinks(md) {
  const links = [];
  const regex = /\[[^\]]*\]\(([^\)]+)\)/g; // [text](target)
  let m;
  while ((m = regex.exec(md)) !== null) {
    links.push(m[1].trim());
  }
  return links;
}

function isExternalLink(target) {
  return /^(https?:)?\/\//i.test(target);
}

function stripFragmentAndQuery(target) {
  return target.split('#')[0].split('?')[0];
}

function candidatesForLocalLink(link, fileDir) {
  const t = stripFragmentAndQuery(link);
  const cands = [];

  // Already an .md path or other file
  if (/\.[a-zA-Z0-9]+$/.test(t)) {
    const abs = path.resolve(fileDir, t);
    cands.push(abs);
    return cands;
  }

  // No extension: try relative .md and wiki-root .md
  const rel = path.resolve(fileDir, t + '.md');
  cands.push(rel);
  // If link did not include a slash, try wiki root as well
  if (!t.includes('/')) {
    cands.push(path.join(wikiRoot, t + '.md'));
  }
  return cands;
}

async function checkExternalLink(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

(async () => {
  const files = listMarkdownFiles(wikiRoot);
  const broken = [];
  const externalBroken = [];

  for (const file of files) {
    const md = fs.readFileSync(file, 'utf8');
    const links = extractLinks(md);
    const dir = path.dirname(file);

    for (const link of links) {
      if (!link || link.startsWith('#') || link.startsWith('mailto:')) continue;
      if (isExternalLink(link)) {
        if (checkExternal) {
          const ok = await checkExternalLink(link.startsWith('http') ? link : `https:${link}`);
          if (!ok) externalBroken.push({ file, link });
        }
        continue;
      }
      // local link
      const candidates = candidatesForLocalLink(link, dir);
      const exists = candidates.some(p => fs.existsSync(p));
      if (!exists) broken.push({ file, link, tried: candidates });
    }
  }

  function rel(p) { return path.relative(repoRoot, p); }

  if (broken.length) {
    console.error('Broken local links:');
    for (const b of broken) {
      console.error(`- ${rel(b.file)} -> ${b.link}`);
      b.tried.forEach(t => console.error(`   tried: ${rel(t)}`));
    }
  }
  if (externalBroken.length) {
    console.error('Broken external links:');
    for (const b of externalBroken) {
      console.error(`- ${rel(b.file)} -> ${b.link}`);
    }
  }

  const totalBroken = broken.length + externalBroken.length;
  if (totalBroken === 0) {
    console.log(`✅ No broken links found across ${files.length} wiki files`);
  } else {
    console.error(`❌ Found ${totalBroken} broken link(s)`);
    process.exit(1);
  }
})();
