#!/usr/bin/env node
// JUnit CLI (moved from @rdcp.dev/server)
import fs from 'node:fs'
import path from 'node:path'

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
const resultsPath=process.env.RDCP_RESULTS||'reports/rdcp.results.json'
const outputPath=process.env.RDCP_JUNIT_OUT||'reports/rdcp.junit.xml'
function readResults(file){const txt=fs.readFileSync(file,'utf8');return JSON.parse(txt)}
function flatten(results){const cases=[];const suites=Array.isArray(results.suites)?results.suites:[];for(const s of suites){const inner=Array.isArray(s.suites)?s.suites:[];for(const t of inner){cases.push({name:t.title||'unnamed',file:s.file||'',status:t.status||'passed',duration:typeof t.durationMs==='number'?t.durationMs/1000:0})}}return cases}
function build(results){const cases=flatten(results);const tests=cases.length;const failures=cases.filter(c=>c.status&&c.status!=='passed').length;const time=(results.summary?.durationMs||0)/1000;const tsName='RDCP Conformance';let xml='';xml+='<?xml version="1.0" encoding="UTF-8"?>\n';xml+=`<testsuites tests="${tests}" failures="${failures}" time="${time.toFixed(3)}">\n`;xml+=`  <testsuite name="${esc(tsName)}" tests="${tests}" failures="${failures}" time="${time.toFixed(3)}">\n`;for(const c of cases){const cls=path.dirname(c.file||'')||'rdcp.tests';xml+=`    <testcase classname="${esc(cls)}" name="${esc(c.name)}" time="${(c.duration||0).toFixed(3)}">\n`;if(c.status&&c.status!=='passed'){xml+=`      <failure message="${esc(c.status)}"/>\n`;}xml+='    </testcase>\n'}xml+='  </testsuite>\n';xml+='</testsuites>\n';return xml}
fs.mkdirSync(path.dirname(outputPath),{recursive:true})
const results=readResults(resultsPath)
const xml=build(results)
fs.writeFileSync(outputPath,xml,'utf8')
console.log(`JUnit report written to ${outputPath}`)
