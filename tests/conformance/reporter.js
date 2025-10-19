// Jest Conformance Reporter - writes JSON and Markdown summaries
// Output: reports/rdcp.results.json and reports/rdcp.report.md

const fs = require('fs')
const path = require('path')

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true })
  } catch (e) {
    /* no-op */
  }
}

function extractTags(title) {
  const m = title.match(/^\[([^\]]+)\]/)
  if (!m) return []
  return m[1]
    .split('][')
    .map(s => s.replace(/\[|\]/g, ''))
    .flatMap(s => s.split(','))
    .map(s => s.trim())
    .filter(Boolean)
}

class ConformanceReporter {
  onRunComplete(_, results) {
    const outDir = 'reports'
    ensureDir(outDir)

    const suites = results.testResults.map(s => ({
      file: s.testFilePath,
      status: s.numFailingTests > 0 ? 'failed' : 'passed',
      startTime: s.perfStats?.start || 0,
      endTime: s.perfStats?.end || 0,
      durationMs: s.perfStats ? s.perfStats.end - s.perfStats.start : undefined,
      suites: s.testResults.map(t => ({
        title: t.ancestorTitles.concat([t.title]).join(' > '),
        status: t.status,
        tags: extractTags(t.ancestorTitles[0] || ''),
        durationMs: t.duration,
      })),
    }))

    const summary = {
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      total: results.numTotalTests,
      suitesPassed: results.numPassedTestSuites,
      suitesFailed: results.numFailedTestSuites,
      suitesTotal: results.numTotalTestSuites,
      startTime: results.startTime,
      success: results.success,
    }

    // JSON
    fs.writeFileSync(
      path.join(outDir, 'rdcp.results.json'),
      JSON.stringify({ summary, suites }, null, 2)
    )

    // Markdown
    const lines = []
    lines.push('# RDCP Conformance Report')
    lines.push('')
    lines.push(`- Tests: ${summary.passed}/${summary.total} passed`)
    lines.push(
      `- Suites: ${summary.suitesPassed}/${summary.suitesTotal} passed`
    )
    lines.push('')
    lines.push('| Status | Tags | Test |')
    lines.push('|---|---|---|')
    for (const s of suites) {
      for (const t of s.suites) {
        const tags = t.tags.join(',')
        lines.push(`| ${t.status} | ${tags} | ${t.title} |`)
      }
    }
    fs.writeFileSync(path.join(outDir, 'rdcp.report.md'), lines.join('\n'))
  }
}

module.exports = ConformanceReporter
