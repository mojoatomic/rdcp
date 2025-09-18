// Mint a demo JWT for Standard mode
// Usage: node scripts/mint-jwt.js <subject> [scopesCsv] [expires]
// Requires env: JWT_SECRET

const jwt = require('jsonwebtoken')

const secret = process.env.JWT_SECRET
if (!secret) {
  console.error('JWT_SECRET is required')
  process.exit(1)
}

const subject = process.argv[2] || 'user@example.com'
const scopesCsv = process.argv[3] || 'discovery,status,control'
const expires = process.argv[4] || '1h'

const token = jwt.sign(
  { sub: subject, scopes: scopesCsv.split(',') },
  secret,
  { algorithm: 'HS256', expiresIn: expires }
)

process.stdout.write(token)