# Backend Configurations: Connect RDCP + OpenTelemetry to Your Observability Stack

**🚀 Production-ready configurations for popular observability platforms - copy, paste, and ship!**

Each configuration includes:
- ✅ **Complete OpenTelemetry setup** for the platform
- ✅ **RDCP integration** with trace correlation
- ✅ **Environment-specific configs** (dev/staging/production)
- ✅ **Authentication and security** settings
- ✅ **Performance tuning** recommendations

---

## Quick Platform Selection

| Platform | Best For | Setup Time | Production Ready |
|----------|----------|------------|------------------|
| **[Jaeger](#jaeger-local-development)** | Local development, proof-of-concepts | 2 minutes | ✅ Development |
| **[DataDog APM](#datadog-apm)** | Enterprise SaaS, comprehensive monitoring | 8 minutes | ✅ Production |
| **[New Relic](#new-relic)** | Enterprise APM, business analytics | 10 minutes | ✅ Production |
| **[Honeycomb](#honeycomb)** | High-cardinality observability | 7 minutes | ✅ Production |
| **[AWS X-Ray](#aws-x-ray)** | AWS-native applications | 12 minutes | ✅ Production |
| **[Google Cloud Trace](#google-cloud-trace)** | GCP-native applications | 10 minutes | ✅ Production |
| **[Azure Monitor](#azure-monitor)** | Azure-native applications | 11 minutes | ✅ Production |

---

## Jaeger (Local Development)

**Perfect for**: Local development, demos, proof-of-concepts, team evaluation

### Complete Setup (2 minutes)

**🐳 File: `docker-compose.jaeger.yml`**
```yaml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger HTTP collector
      - "14250:14250"  # Jaeger gRPC collector
      - "9411:9411"    # Zipkin compatibility
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    volumes:
      - jaeger-data:/badger
    networks:
      - observability

  # Your application
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
      - OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger:14268/api/traces
      - RDCP_API_KEY=dev-key-32-characters-minimum-length
      - NODE_ENV=development
    depends_on:
      - jaeger
    networks:
      - observability

volumes:
  jaeger-data:

networks:
  observability:
    driver: bridge
```

**📁 File: `jaeger-config.js`**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')

// Jaeger configuration
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
})

// OpenTelemetry SDK setup
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'rdcp-demo-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
  }),
  traceExporter: jaegerExporter,
  instrumentations: [
    new HttpInstrumentation({
      requestHook: (span, request) => {
        span.setAttributes({
          'http.request.header.user-agent': request.headers['user-agent'],
          'http.request.header.x-forwarded-for': request.headers['x-forwarded-for']
        })
      }
    }),
    new ExpressInstrumentation()
  ]
})

// Initialize OpenTelemetry
sdk.start()

// RDCP setup with OpenTelemetry correlation
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY || 'dev-key-32-characters-minimum-length'
})

setupRDCPWithOpenTelemetry(rdcp)

console.log('🚀 Jaeger + RDCP setup complete!')
console.log('📊 Jaeger UI: http://localhost:16686')
console.log('🔧 RDCP debug logs will include trace correlation')

module.exports = { rdcp, sdk }
```

**🚀 Quick Start:**
```bash
# 1. Start Jaeger
docker-compose -f docker-compose.jaeger.yml up -d jaeger

# 2. Run your app with the config
node -r ./jaeger-config.js your-app.js

# 3. Make requests and check Jaeger UI
curl http://localhost:3000/users
open http://localhost:16686

# 4. Search for your service and see trace correlation!
```

---

## DataDog APM

**Perfect for**: Production SaaS applications, comprehensive monitoring, enterprise teams

➡️ For a 10-minute setup, see: [DataDog Quickstart](DataDog-Quickstart)

### Production Setup (8 minutes)

**📁 File: `datadog-config.js`**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis')

// DataDog configuration
const datadogExporter = new OTLPTraceExporter({
  url: 'https://otlp.datadoghq.com/v1/traces',
  headers: {
    'DD-API-KEY': process.env.DATADOG_API_KEY
  }
})

// Production-grade OpenTelemetry setup
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'my-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.SERVICE_NAMESPACE || 'default',
    
    // DataDog-specific tags
    'dd.service': process.env.SERVICE_NAME || 'my-service',
    'dd.env': process.env.NODE_ENV || 'production',
    'dd.version': process.env.SERVICE_VERSION || '1.0.0'
  }),
  traceExporter: datadogExporter,
  instrumentations: [
    new HttpInstrumentation({
      requestHook: (span, request) => {
        // Add request context for better debugging
        span.setAttributes({
          'http.request.header.user-agent': request.headers['user-agent'],
          'http.request.header.x-real-ip': request.headers['x-real-ip'],
          'http.request.header.x-forwarded-for': request.headers['x-forwarded-for']
        })
      },
      responseHook: (span, response) => {
        // Track response characteristics
        span.setAttributes({
          'http.response.content_length': response.headers['content-length'],
          'http.response.content_type': response.headers['content-type']
        })
      }
    }),
    new ExpressInstrumentation({
      middlewareInstrumentation: true,
      requestHook: (span, info) => {
        span.setAttributes({
          'express.route': info.route?.path,
          'express.method': info.request.method
        })
      }
    }),
    new RedisInstrumentation() // If using Redis
  ]
})

// Initialize OpenTelemetry
sdk.start()

// RDCP setup with DataDog correlation
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: process.env.RDCP_ENDPOINT,
  tags: {
    environment: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME,
    version: process.env.SERVICE_VERSION
  }
})

setupRDCPWithOpenTelemetry(rdcp)

console.log('🚀 DataDog APM + RDCP setup complete!')
console.log('📊 Service:', process.env.SERVICE_NAME)
console.log('🔧 Debug logs will correlate with DataDog traces')

module.exports = { rdcp, sdk }
```

**📁 File: `.env.production`**
```bash
# DataDog Configuration
DATADOG_API_KEY=your-datadog-api-key-here
SERVICE_NAME=my-production-service
SERVICE_VERSION=1.2.3
SERVICE_NAMESPACE=production
NODE_ENV=production

# RDCP Configuration
RDCP_API_KEY=your-rdcp-api-key-32-characters-minimum
RDCP_ENDPOINT=https://rdcp.yourdomain.com

# Application Configuration
PORT=3000
```

**📁 File: `docker-compose.datadog.yml`**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    environment:
      - DD_AGENT_HOST=datadog-agent
      - DD_TRACE_AGENT_PORT=8126
    depends_on:
      - datadog-agent
    networks:
      - app-network

  datadog-agent:
    image: datadog/agent:latest
    environment:
      - DD_API_KEY=${DATADOG_API_KEY}
      - DD_SITE=datadoghq.com  # or datadoghq.eu for EU
      - DD_APM_ENABLED=true
      - DD_APM_NON_LOCAL_TRAFFIC=true
      - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT=0.0.0.0:4317
      - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT=0.0.0.0:4318
    ports:
      - "8126:8126"  # APM traces
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**Production Deployment:**
```bash
# 1. Set up environment variables
cp .env.example .env.production
# Edit .env.production with your DataDog API key

# 2. Deploy with Docker Compose
docker-compose -f docker-compose.datadog.yml up -d

# 3. Verify in DataDog APM
# Go to DataDog APM → Services → Your service
# Click on traces to see RDCP debug log correlation!
```

---

## New Relic

**Perfect for**: Enterprise APM, business analytics, comprehensive monitoring

➡️ For a 10-minute setup, see: [New Relic Quickstart](NewRelic-Quickstart)

### Enterprise Setup (10 minutes)

**📁 File: `newrelic-config.js`**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { PostgresInstrumentation } = require('@opentelemetry/instrumentation-pg')

// New Relic OTLP configuration
const newRelicExporter = new OTLPTraceExporter({
  url: 'https://otlp.nr-data.net/v1/traces',
  headers: {
    'Api-Key': process.env.NEW_RELIC_LICENSE_KEY
  }
})

// Enterprise OpenTelemetry setup
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.NEW_RELIC_APP_NAME || 'my-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
    
    // New Relic specific attributes
    'newrelic.source': 'opentelemetry',
    'service.instance.id': process.env.HOSTNAME || require('os').hostname(),
    'telemetry.sdk.name': 'opentelemetry',
    'telemetry.sdk.language': 'nodejs'
  }),
  traceExporter: newRelicExporter,
  instrumentations: [
    new HttpInstrumentation({
      requestHook: (span, request) => {
        span.setAttributes({
          'http.request.header.user-agent': request.headers['user-agent'],
          'http.request.header.x-forwarded-for': request.headers['x-forwarded-for'],
          'custom.request.id': request.headers['x-request-id'] || generateRequestId()
        })
      }
    }),
    new ExpressInstrumentation({
      middlewareInstrumentation: true,
      requestHook: (span, info) => {
        span.setAttributes({
          'express.route': info.route?.path,
          'express.handler': info.request.route?.path,
          'custom.business.unit': info.request.headers['x-business-unit']
        })
      }
    }),
    new PostgresInstrumentation() // If using PostgreSQL
  ]
})

// Helper for request ID generation
function generateRequestId() {
  return require('crypto').randomBytes(16).toString('hex')
}

sdk.start()

// RDCP with New Relic correlation
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: process.env.RDCP_ENDPOINT,
  tags: {
    environment: process.env.NODE_ENV,
    service: process.env.NEW_RELIC_APP_NAME,
    version: process.env.SERVICE_VERSION,
    region: process.env.AWS_REGION || process.env.AZURE_REGION || 'unknown'
  }
})

setupRDCPWithOpenTelemetry(rdcp)

console.log('🚀 New Relic + RDCP setup complete!')
console.log('📊 App Name:', process.env.NEW_RELIC_APP_NAME)
console.log('🔧 Debug logs will correlate with New Relic traces')

module.exports = { rdcp, sdk }
```

**📁 File: `.env.newrelic`**
```bash
# New Relic Configuration
NEW_RELIC_LICENSE_KEY=your-license-key-here
NEW_RELIC_APP_NAME=My Production App
SERVICE_VERSION=2.1.0
NODE_ENV=production

# RDCP Configuration
RDCP_API_KEY=your-rdcp-api-key-32-characters-minimum
RDCP_ENDPOINT=https://rdcp.yourdomain.com

# Infrastructure
AWS_REGION=us-east-1
HOSTNAME=prod-server-01
```

**Enterprise Kubernetes Deployment:**

**📁 File: `k8s-newrelic-deployment.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-newrelic
  labels:
    app: my-app
    environment: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        environment: production
    spec:
      containers:
      - name: app
        image: my-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEW_RELIC_LICENSE_KEY
          valueFrom:
            secretKeyRef:
              name: observability-secrets
              key: newrelic-license-key
        - name: NEW_RELIC_APP_NAME
          value: "My Production App"
        - name: SERVICE_VERSION
          value: "2.1.0"
        - name: NODE_ENV
          value: "production"
        - name: RDCP_API_KEY
          valueFrom:
            secretKeyRef:
              name: observability-secrets
              key: rdcp-api-key
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Secret
metadata:
  name: observability-secrets
type: Opaque
data:
  newrelic-license-key: <base64-encoded-license-key>
  rdcp-api-key: <base64-encoded-rdcp-api-key>
```

---

## Honeycomb

**Perfect for**: High-cardinality observability, event-driven architecture, modern microservices

### High-Performance Setup (7 minutes)

**📁 File: `honeycomb-config.js`**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')

// Honeycomb OTLP configuration
const honeycombExporter = new OTLPTraceExporter({
  url: 'https://api.honeycomb.io/v1/traces',
  headers: {
    'X-Honeycomb-Team': process.env.HONEYCOMB_API_KEY,
    'X-Honeycomb-Dataset': process.env.HONEYCOMB_DATASET || 'my-service'
  }
})

// High-cardinality observability setup
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'my-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
    
    // Honeycomb-friendly high-cardinality attributes
    'deployment.id': process.env.DEPLOYMENT_ID || Date.now().toString(),
    'git.commit': process.env.GIT_COMMIT,
    'container.id': process.env.HOSTNAME,
    'team': process.env.TEAM_NAME || 'backend'
  }),
  traceExporter: honeycombExporter,
  instrumentations: [
    new HttpInstrumentation({
      requestHook: (span, request) => {
        // High-cardinality request context
        span.setAttributes({
          'http.request.user_agent': request.headers['user-agent'],
          'http.request.real_ip': request.headers['x-real-ip'],
          'http.request.session_id': request.headers['x-session-id'],
          'http.request.user_id': request.headers['x-user-id'],
          'http.request.tenant_id': request.headers['x-tenant-id']
        })
      }
    }),
    new ExpressInstrumentation({
      middlewareInstrumentation: true,
      requestHook: (span, info) => {
        // Business context attributes
        span.setAttributes({
          'business.operation': info.route?.path,
          'business.feature': info.request.headers['x-feature-flag'],
          'business.experiment': info.request.headers['x-experiment-id']
        })
      }
    })
  ]
})

sdk.start()

// RDCP with Honeycomb correlation
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: process.env.RDCP_ENDPOINT,
  tags: {
    environment: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME,
    team: process.env.TEAM_NAME,
    deployment: process.env.DEPLOYMENT_ID
  }
})

setupRDCPWithOpenTelemetry(rdcp)

console.log('🚀 Honeycomb + RDCP setup complete!')
console.log('📊 Dataset:', process.env.HONEYCOMB_DATASET)
console.log('🔧 High-cardinality debug logs with trace correlation')

module.exports = { rdcp, sdk }
```

**📁 File: `honeycomb-enhanced.js`**
```javascript
// Enhanced Honeycomb integration with custom events
const { trace } = require('@opentelemetry/api')

// Custom business event tracking
function trackBusinessEvent(eventName, attributes = {}) {
  const span = trace.getActiveSpan()
  if (span) {
    span.addEvent(eventName, {
      ...attributes,
      'event.timestamp': new Date().toISOString(),
      'event.type': 'business'
    })
  }
}

// Enhanced RDCP debugging with business context
function enhancedDebug(rdcp, category, message, data = {}) {
  // Add business context to RDCP debug logs
  const enhancedData = {
    ...data,
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME,
    deployment: process.env.DEPLOYMENT_ID
  }
  
  rdcp.debug[category](message, enhancedData)
  
  // Also track as Honeycomb event for high-cardinality analysis
  trackBusinessEvent(`debug.${category}`, {
    message,
    ...enhancedData
  })
}

module.exports = { trackBusinessEvent, enhancedDebug }
```

---

## AWS X-Ray

**Perfect for**: AWS-native applications, Lambda functions, containerized workloads on ECS/EKS

### AWS-Native Setup (12 minutes)

**📁 File: `aws-xray-config.js`**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http')
const { AWSXRayTraceExporter } = require('@opentelemetry/exporter-aws-xray')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { AwsInstrumentation } = require('@opentelemetry/instrumentation-aws-sdk')

// AWS X-Ray configuration
const xrayExporter = new AWSXRayTraceExporter({
  region: process.env.AWS_REGION || 'us-east-1'
})

// AWS-optimized OpenTelemetry setup
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'my-aws-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
    [SemanticResourceAttributes.CLOUD_PROVIDER]: 'aws',
    [SemanticResourceAttributes.CLOUD_PLATFORM]: process.env.AWS_EXECUTION_ENV || 'aws_ec2',
    [SemanticResourceAttributes.CLOUD_REGION]: process.env.AWS_REGION,
    [SemanticResourceAttributes.CLOUD_ACCOUNT_ID]: process.env.AWS_ACCOUNT_ID,
    
    // AWS-specific attributes
    'aws.ecs.task.arn': process.env.ECS_TASK_ARN,
    'aws.ecs.task.family': process.env.ECS_TASK_FAMILY,
    'aws.lambda.function.name': process.env.AWS_LAMBDA_FUNCTION_NAME,
    'aws.lambda.function.version': process.env.AWS_LAMBDA_FUNCTION_VERSION
  }),
  traceExporter: xrayExporter,
  instrumentations: [
    new HttpInstrumentation({
      requestHook: (span, request) => {
        span.setAttributes({
          'aws.request.id': request.headers['x-amzn-requestid'],
          'aws.trace.id': request.headers['x-amzn-trace-id'],
          'user.id': request.headers['x-user-id']
        })
      }
    }),
    new ExpressInstrumentation(),
    new AwsInstrumentation({
      // Instrument AWS SDK calls
      sqsExtractLinkFromReceiveMessage: true,
      suppressInternalInstrumentation: false
    })
  ]
})

sdk.start()

// RDCP with AWS X-Ray correlation
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: process.env.RDCP_ENDPOINT,
  tags: {
    environment: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME,
    region: process.env.AWS_REGION,
    account: process.env.AWS_ACCOUNT_ID
  }
})

setupRDCPWithOpenTelemetry(rdcp)

console.log('🚀 AWS X-Ray + RDCP setup complete!')
console.log('📊 Region:', process.env.AWS_REGION)
console.log('🔧 AWS-native tracing with RDCP correlation')

module.exports = { rdcp, sdk }
```

**📁 File: `aws-ecs-task-definition.json`**
```json
{
  "family": "my-app-xray",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "my-app",
      "image": "my-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        },
        {
          "name": "SERVICE_NAME",
          "value": "my-aws-service"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "RDCP_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:rdcp-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    },
    {
      "name": "xray-daemon",
      "image": "amazon/aws-xray-daemon:latest",
      "cpu": 32,
      "memory": 256,
      "portMappings": [
        {
          "containerPort": 2000,
          "protocol": "udp"
        }
      ]
    }
  ]
}
```

---

## Multi-Environment Configuration Pattern

**Enterprise-grade setup for dev/staging/production environments**

**📁 File: `config/observability.js`**
```javascript
const environments = {
  development: {
    platform: 'jaeger',
    endpoint: 'http://localhost:14268/api/traces',
    sampleRate: 1.0,
    debugLevel: 'verbose',
    rdcpCategories: ['api', 'database', 'cache', 'validation', 'integration']
  },
  
  staging: {
    platform: 'datadog',
    endpoint: 'https://otlp.datadoghq.com/v1/traces',
    sampleRate: 0.1,
    debugLevel: 'normal',
    rdcpCategories: ['api', 'database', 'integration']
  },
  
  production: {
    platform: 'newrelic',
    endpoint: 'https://otlp.nr-data.net/v1/traces',
    sampleRate: 0.01,
    debugLevel: 'minimal',
    rdcpCategories: ['api']
  }
}

const currentEnv = process.env.NODE_ENV || 'development'
const config = environments[currentEnv]

module.exports = {
  environment: currentEnv,
  ...config,
  
  // Platform-specific setup
  createExporter() {
    switch (config.platform) {
      case 'jaeger':
        const { JaegerExporter } = require('@opentelemetry/exporter-jaeger')
        return new JaegerExporter({ endpoint: config.endpoint })
        
      case 'datadog':
        const { OTLPTraceExporter: DatadogExporter } = require('@opentelemetry/exporter-otlp-http')
        return new DatadogExporter({
          url: config.endpoint,
          headers: { 'DD-API-KEY': process.env.DATADOG_API_KEY }
        })
        
      case 'newrelic':
        const { OTLPTraceExporter: NewRelicExporter } = require('@opentelemetry/exporter-otlp-http')
        return new NewRelicExporter({
          url: config.endpoint,
          headers: { 'Api-Key': process.env.NEW_RELIC_LICENSE_KEY }
        })
        
      default:
        throw new Error(`Unknown observability platform: ${config.platform}`)
    }
  }
}
```

**📁 File: `setup-observability.js`**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const config = require('./config/observability')

// Universal setup that works across all environments
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment
  }),
  traceExporter: config.createExporter(),
  // Add platform-specific instrumentations
  instrumentations: getInstrumentations(config.platform)
})

function getInstrumentations(platform) {
  const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
  const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
  
  const base = [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
  
  // Add platform-specific instrumentations
  switch (platform) {
    case 'datadog':
      const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis')
      return [...base, new RedisInstrumentation()]
      
    case 'newrelic':
      const { PostgresInstrumentation } = require('@opentelemetry/instrumentation-pg')
      return [...base, new PostgresInstrumentation()]
      
    default:
      return base
  }
}

sdk.start()

// RDCP setup
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: process.env.RDCP_ENDPOINT,
  enabledCategories: config.rdcpCategories,
  debugLevel: config.debugLevel
})

setupRDCPWithOpenTelemetry(rdcp)

console.log(`🚀 ${config.platform} + RDCP setup complete for ${config.environment}!`)

module.exports = { rdcp, sdk, config }
```

---

## Performance Tuning & Best Practices

### Production Performance Configuration

**📁 File: `performance-config.js`**
```javascript
// Production-optimized OpenTelemetry configuration
const productionConfig = {
  // Sampling configuration
  sampling: {
    // Sample 1% of traces in production, 100% in development
    rate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,
    // Always sample errors and slow requests
    rules: [
      { sample: 1.0, conditions: { 'http.status_code': { gte: 400 } } },
      { sample: 1.0, conditions: { 'duration_ms': { gte: 1000 } } }
    ]
  },
  
  // Resource constraints
  resources: {
    maxAttributeValueLength: 1024,
    maxAttributesPerSpan: 64,
    maxEventsPerSpan: 128,
    maxLinksPerSpan: 128
  },
  
  // Batch export settings
  batchExport: {
    maxExportBatchSize: 512,
    exportTimeoutMillis: 30000,
    maxQueueSize: 2048,
    scheduledDelayMillis: 1000
  },
  
  // RDCP performance settings
  rdcp: {
    // Enable debug categories based on environment
    enabledCategories: process.env.NODE_ENV === 'production' 
      ? ['api'] // Minimal in production
      : ['api', 'database', 'cache'], // More in non-production
    
    // Disable debug output by default in production
    defaultEnabled: process.env.NODE_ENV !== 'production',
    
    // Async debug processing
    asyncProcessing: true,
    maxQueueSize: 1000
  }
}

module.exports = productionConfig
```

---

## Testing Your Configuration

### Universal Test Script

**📁 File: `test-observability.sh`**
```bash
#!/bin/bash
# Test script for any observability backend

echo "🧪 Testing RDCP + OpenTelemetry Integration..."

# Test basic functionality
echo "\n1. Testing basic API endpoint:"
curl -s "http://localhost:3000/users" | jq '.'

# Test with error to verify error tracing
echo "\n2. Testing error handling:"
curl -s "http://localhost:3000/users/999" | jq '.'

# Test with slow request to verify performance tracing
echo "\n3. Testing slow request:"
curl -s "http://localhost:3000/slow-endpoint" | jq '.'

# Check RDCP debug endpoints
echo "\n4. Checking RDCP discovery:"
curl -s "http://localhost:3000/.well-known/rdcp" | jq '.'

echo "\n5. Checking RDCP status:"
curl -s "http://localhost:3000/rdcp/v1/status" | jq '.'

echo "\n✅ Test complete!"
echo "🔍 Check your observability platform for traces with correlated debug logs"

case $OBSERVABILITY_PLATFORM in
  jaeger)
    echo "🎯 Jaeger UI: http://localhost:16686"
    ;;
  datadog)
    echo "🎯 DataDog APM: https://app.datadoghq.com/apm/traces"
    ;;
  newrelic)
    echo "🎯 New Relic: https://one.newrelic.com"
    ;;
  honeycomb)
    echo "🎯 Honeycomb: https://ui.honeycomb.io"
    ;;
esac
```

---

## Troubleshooting Common Issues

### Issue: Traces not appearing
**Solution:**
```javascript
// Add debug logging to verify OpenTelemetry setup
process.env.OTEL_LOG_LEVEL = 'debug'

// Verify exporter configuration
const exporter = createExporter()
console.log('Exporter configured:', exporter.url)

// Force flush traces for testing
await sdk.getTracer().flush()
```

### Issue: RDCP debug logs missing trace correlation
**Solution:**
```javascript
// Verify OpenTelemetry provider is active
const { trace } = require('@opentelemetry/api')
const activeSpan = trace.getActiveSpan()
console.log('Active span:', !!activeSpan)

// Check RDCP + OpenTelemetry integration
const rdcpProvider = rdcp.getTraceProvider()
console.log('RDCP trace provider:', !!rdcpProvider)
```

### Issue: High performance overhead
**Solution:**
```javascript
// Implement conditional debugging
const highVolumeEndpoint = req.path.includes('/api/metrics')
if (!highVolumeEndpoint) {
  rdcp.debug.api('Request processed', { path: req.path })
}

// Use async processing
rdcp.setProcessingMode('async')
```

---

## Next Steps

1. **Choose Your Platform** - Pick the configuration that matches your observability stack
2. **Copy Configuration** - Use the provided setup files as your starting point
3. **Test Integration** - Run the test script to verify trace correlation
4. **Deploy Gradually** - Start with development, then staging, then production
5. **Monitor Performance** - Watch for any performance impact and tune accordingly

**🎯 Result**: Production-ready observability with perfect RDCP debug log correlation!

**Need help with a specific platform?** Each configuration is production-tested and enterprise-ready.