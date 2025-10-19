#!/usr/bin/env node
// Badges CLI (moved from @rdcp.dev/server)
import fs from 'node:fs'
import path from 'node:path'

const RESULTS=process.env.RDCP_RESULTS||'reports/rdcp.results.json'
const OUT_DIR=process.env.RDCP_BADGES_OUT||'reports/badges'
function ensureDir(p){fs.mkdirSync(p,{recursive:true})}
function readResults(file){const txt=fs.readFileSync(file,'utf8');return JSON.parse(txt)}
function colorFor(f){if(f===0)return'brightgreen';if(f<5)return'yellow';return'red'}
function svg(label,msg,color){const pad=6,charW=7,lh=label.length*charW+pad*2,rh=msg.length*charW+pad*2,w=lh+rh,h=20,labelX=lh/2,msgX=lh+rh/2;return`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">\n  <linearGradient id="s" x2="0" y2="100%">\n    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>\n    <stop offset="1" stop-opacity=".1"/>\n  </linearGradient>\n  <mask id="m"><rect width="${w}" height="${h}" rx="3" fill="#fff"/></mask>\n  <g mask="url(#m)">\n    <rect width="${lh}" height="${h}" fill="#555"/>\n    <rect x="${lh}" width="${rh}" height="${h}" fill="${color==='brightgreen'?'#4c1':color==='yellow'?'#dfb317':'#e05d44'}"/>\n    <rect width="${w}" height="${h}" fill="url(#s)"/>\n  </g>\n  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">\n    <text x="${labelX}" y="14">${label}</text>\n    <text x="${msgX}" y="14">${msg}</text>\n  </g>\n</svg>`}
function collectCases(results){const out=[];const suites=Array.isArray(results.suites)?results.suites:[];for(const s of suites){const inner=Array.isArray(s.suites)?s.suites:[];for(const t of inner){out.push({status:t.status||'passed',tags:Array.isArray(t.tags)?t.tags.map(String):[],title:t.title||'',file:s.file||''})}}return out}
function write(prefix,label,passed,total){const failed=Math.max(0,total-passed),color=colorFor(failed);const shields={schemaVersion:1,label,message:`${passed}/${total}`,color};ensureDir(OUT_DIR);fs.writeFileSync(path.join(OUT_DIR,`${prefix}.json`),JSON.stringify(shields,null,2));fs.writeFileSync(path.join(OUT_DIR,`${prefix}.svg`),svg(label.toUpperCase(),`${passed}/${total}`,color))}
function summarize(list,fn=()=>true){const items=list.filter(fn);return{passed:items.filter(c=>c.status==='passed').length,total:items.length}}
const results=readResults(RESULTS);const all=collectCases(results);const overall=summarize(all);write('rdcp-summary','rdcp conformance',overall.passed,overall.total);for(const p of['basic','standard','enterprise']){const {passed,total}=summarize(all,c=>c.tags.includes(p));write(`profile-${p}`,`${p}`,passed,total)}for(const a of['control','jwks','keyring','jwt','admin','etag','util','otel','tenant','ttl','audit','rate-limit','client','integration','status','auth','headers','metrics','put','schema']){const {passed,total}=summarize(all,c=>c.tags.includes(a));write(`cap-${a}`,`${a}`,passed,total)}
console.log(`Badges written to ${OUT_DIR}`)
