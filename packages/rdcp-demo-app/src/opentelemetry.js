// OpenTelemetry bootstrap for the RDCP demo app
// Loads before server to enable auto-instrumentations

const { NodeSDK } = require('@opentelemetry/sdk-node')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const serviceName = process.env.OTEL_SERVICE_NAME || 'rdcp-demo-app'
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'

const exporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`
})

const sdk = new NodeSDK({
  traceExporter: exporter,
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName
  }),
  instrumentations: [getNodeAutoInstrumentations()]
})

const started = sdk.start()
if (started && typeof started.then === 'function') {
  started.then(() => {
    // Integrate RDCP trace correlation
    setupRDCPWithOpenTelemetry({ enableTraceCorrelation: true })
    console.info(`OpenTelemetry started for ${serviceName} -> ${otlpEndpoint}`)
  }).catch(err => {
    console.error('Failed to start OpenTelemetry:', err)
  })
} else {
  // Some SDK versions start synchronously
  setupRDCPWithOpenTelemetry({ enableTraceCorrelation: true })
  console.info(`OpenTelemetry started (sync) for ${serviceName} -> ${otlpEndpoint}`)
}
