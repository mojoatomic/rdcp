// Executes framework example snippets to ensure they run as documented
const http = require('http')

async function runExamples() {
  console.log('Running framework examples...')
  await fetch('http://localhost:3000/.well-known/rdcp').then(r => r.json()).then(j => console.log('Discovery OK:', j.protocol === 'rdcp/1.0'))
  await fetch('http://localhost:3000/rdcp/v1/discovery').then(r => r.json()).then(j => console.log('Status OK:', !!j.timestamp))
  await fetch('http://localhost:3000/api/users').then(r => r.json()).then(j => console.log('Users OK:', Array.isArray(j.users)))
  console.log('Examples executed.')
}

runExamples().catch(err => {
  console.error('Examples failed:', err)
  process.exit(1)
})
