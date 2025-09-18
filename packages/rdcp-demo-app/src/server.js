const { app } = require('./app')

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.info(`RDCP Demo App listening on http://localhost:${port}`)
  console.info('Endpoints: /.well-known/rdcp, /rdcp/v1/{discovery,control,status,health}, /api/{users,reports}')
})
