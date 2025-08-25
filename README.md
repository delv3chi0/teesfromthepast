# Tees From The Past

A full-stack e-commerce platform for custom t-shirt designs with AI-powered design tools.

## Recent Backend Improvements

This repository has been enhanced with comprehensive backend improvements focused on observability, reliability, and maintainability. See [NEXT_10_BACKEND_TASKS.md](docs/NEXT_10_BACKEND_TASKS.md) for full details.

### New Health & Monitoring Endpoints

#### Health Check Endpoints
- **`GET /health`** - Liveness probe for basic service health
  ```json
  {
    "status": "ok",
    "uptimeSeconds": 12345,
    "version": "1.0.0"
  }
  ```

- **`GET /readiness`** - Readiness probe with comprehensive checks
  ```json
  {
    "status": "ready",
    "checks": {
      "db": { "ok": true, "latencyMs": 15 },
      "external": { "ok": true },
      "config": { "ok": true }
    },
    "version": "1.0.0",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

#### Metrics Endpoint
- **`GET /metrics`** - Prometheus format metrics (requires authentication)
  - Custom HTTP request metrics (counters and histograms)
  - System metrics (memory, CPU, etc.)
  - Authentication via `Authorization: Bearer <token>` header

### Enhanced Error Handling

All API responses now use a unified error envelope format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "code": "invalid_email",
        "message": "Invalid email format"
      }
    ],
    "traceId": "abc123def456"
  }
}
```

### OpenTelemetry Integration

- Distributed tracing with automatic span creation
- Log correlation with trace and span IDs
- Custom instrumentation for database queries
- Configurable exporters (OTLP, console)

## Configuration

### Environment Variables

#### Core Application
```bash
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/teesfromthepast
JWT_SECRET=your-32-character-secret-key
```

#### Observability & Metrics
```bash
# Enable Prometheus metrics endpoint
ENABLE_METRICS=true

# Optional: Secure metrics with bearer token
METRICS_AUTH_TOKEN=your-secret-metrics-token

# Optional: OpenTelemetry OTLP endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

#### Security
```bash
# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

#### External Services
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: Redis for enhanced rate limiting
REDIS_URL=redis://localhost:6379

# Optional: Sentry for error monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

## Development Setup

### Prerequisites
- Node.js 18+ 
- MongoDB
- Redis (optional, for enhanced features)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## API Documentation

### Request Validation

Many routes now include automatic request validation. Invalid requests return detailed error information:

```bash
# Valid request
GET /api/config/limits?format=json&include=effectiveLimitMB

# Invalid request  
GET /api/config/limits?format=invalid
# Returns validation error with details
```

### Health Monitoring

Use the health endpoints for monitoring and load balancer health checks:

```bash
# Quick health check (no external dependencies)
curl http://localhost:5000/health

# Comprehensive readiness check
curl http://localhost:5000/readiness

# Metrics (requires authentication if METRICS_AUTH_TOKEN is set)
curl -H "Authorization: Bearer your-token" http://localhost:5000/metrics
```

## Testing

```bash
cd backend
npm test
```

Test coverage includes:
- Health and readiness endpoint behavior
- Metrics collection and authentication
- Error handling and response formats
- Request validation middleware
- Error class functionality

## Architecture

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with refresh tokens
- **File Storage**: Cloudinary
- **Payments**: Stripe
- **Monitoring**: OpenTelemetry + Prometheus
- **Logging**: Structured logging with Pino
- **Validation**: Zod schemas
- **Error Handling**: Unified error envelope

## Contributing

1. Review [NEXT_10_BACKEND_TASKS.md](docs/NEXT_10_BACKEND_TASKS.md) for planned improvements
2. Follow existing patterns for error handling and validation
3. Add tests for new functionality
4. Ensure proper logging and observability

## Monitoring & Observability

The application includes comprehensive monitoring capabilities:

- **Health Checks**: Automated health and readiness probes
- **Metrics**: Prometheus-compatible metrics with custom business metrics
- **Tracing**: Distributed tracing with OpenTelemetry
- **Logging**: Structured logging with correlation IDs
- **Error Tracking**: Unified error handling with Sentry integration

Set up monitoring dashboards using the `/metrics` endpoint with Prometheus and Grafana.

## License

[Add your license here]