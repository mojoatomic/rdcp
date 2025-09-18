# Enterprise Deployment Patterns (Kubernetes + Service Mesh)

This document provides reference architectures and manifests for deploying RDCP with OpenTelemetry in Kubernetes environments, with optional service mesh.

Reference Architectures
- Single service with RDCP + OpenTelemetry (no mesh)
- Multi-service with Envoy/Istio and W3C TraceContext propagation
- Sidecar-based exporter vs centralized collector patterns

Kubernetes Manifests (Base)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rdcp-app
  labels:
    app: rdcp-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: rdcp-app
  template:
    metadata:
      labels:
        app: rdcp-app
    spec:
      containers:
      - name: app
        image: your-repo/rdcp-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: RDCP_API_KEY
          valueFrom:
            secretKeyRef:
              name: rdcp-secrets
              key: api-key
        - name: OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
          value: "http://otel-collector:4318/v1/traces"
        readinessProbe:
          httpGet:
            path: /rdcp/v1/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /rdcp/v1/health
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: rdcp-app
spec:
  selector:
    app: rdcp-app
  ports:
  - port: 80
    targetPort: 3000
```

OpenTelemetry Collector (Centralized)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  labels:
    app: otel-collector
data:
  otel-collector-config.yaml: |
    receivers:
      otlp:
        protocols:
          http:
            endpoint: 0.0.0.0:4318
          grpc:
            endpoint: 0.0.0.0:4317
    processors:
      batch: {}
      memory_limiter:
        check_interval: 1s
        limit_mib: 400
        spike_limit_mib: 200
    exporters:
      logging:
        loglevel: warn
      otlphttp/datadog:
        endpoint: https://otlp.datadoghq.com
        headers: { "DD-API-KEY": "${DATADOG_API_KEY}" }
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlphttp/datadog]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args: ["--config=/etc/otel/otel-collector-config.yaml"]
        volumeMounts:
        - name: otel-config-vol
          mountPath: /etc/otel
        ports:
        - containerPort: 4318
        - containerPort: 4317
      volumes:
      - name: otel-config-vol
        configMap:
          name: otel-collector-config
```

Istio Service Mesh (Trace Context)
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: rdcp-app-dr
spec:
  host: rdcp-app
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: rdcp-app-vs
spec:
  hosts:
  - rdcp-app
  http:
  - route:
    - destination:
        host: rdcp-app
        port:
          number: 80
```

Header Propagation (W3C TraceContext)
- Ensure proxies/ingress preserve:
  - traceparent
  - tracestate
  - baggage
- For legacy systems using B3, enable B3 to W3C translation in the collector or sidecar.

Patterns: Sidecar vs Centralized Collector
- Sidecar exporter (per pod):
  - Pros: isolation, simplified network paths
  - Cons: higher resource usage per pod
- Centralized collector:
  - Pros: efficient batching, easier policy enforcement
  - Cons: single component to scale/monitor

Blue/Green and Canary Patterns
- Label-driven routing via VirtualService subsets
- Enable RDCP categories only on canary subset
- Compare performance/trace correlation across subsets before full rollout

Security Notes
- Store API keys and exporter credentials in Secrets
- Use NetworkPolicies to restrict egress to collector only
- Prefer mTLS in mesh and TLS for exporter endpoints
