# RDCP Demo App

A comprehensive demonstration application that validates RDCP SDK + OpenTelemetry integration, mirroring the documentation claims.

What this shows:
- RDCP protocol endpoints implemented in Express
- OpenTelemetry integration via @rdcp/otel-plugin
- Visual trace correlation in Jaeger
- Performance characteristics matching the docs
- Framework examples that run as-is

Quick start:
1) Install deps
   npm install

2) Start Jaeger + App via Docker
   docker compose up --build
   # Jaeger UI: http://localhost:16686
   # App:       http://localhost:3000

3) Run locally with OpenTelemetry
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \ 
   OTEL_SERVICE_NAME=rdcp-demo-app \ 
   node --require ./src/opentelemetry.js src/server.js

4) Benchmark
   node scripts/benchmark.js

5) Run framework examples
   node scripts/test-examples.js

Endpoints:
- GET /.well-known/rdcp
- GET /rdcp/v1/discovery
- POST /rdcp/v1/control
- GET /rdcp/v1/status
- GET /rdcp/v1/health
- Business API: /api/users, /api/reports
