# TeesFromThePast

Custom t-shirt design and e-commerce platform with AI-powered design generation.

## Quick Start

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Key Endpoints

- `GET /health` - Health check
- `GET /version` - Version and build information  
- `GET /api/auth/*` - Authentication endpoints
- `GET /api/designs/*` - Design management
- `GET /api/storefront/*` - Product catalog

## Environment Variables

### Core Configuration
- `NODE_ENV` - Environment mode (development/production/test)
- `PORT` - Server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)

### Rate Limiting
- `RATE_LIMIT_WINDOW_SEC` - Rate limit window in seconds (default: 60)
- `RATE_LIMIT_MAX` - Maximum requests per window (default: 120) 
- `RATE_LIMIT_EXEMPT_PATHS` - Comma-separated exempt paths (default: /health,/readiness)
- `RATE_LIMIT_REDIS_PREFIX` - Redis key prefix for rate limiting (default: rl:)

### External Services
- `REDIS_URL` - Redis connection URL (optional, in-memory fallback)
- `STRIPE_SECRET_KEY` - Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `CLOUDINARY_CLOUD_NAME` - Image storage service
- `CLOUDINARY_API_KEY` - Cloudinary API credentials
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

### Optional Features
- `RESEND_API_KEY` - Email delivery service
- `SENTRY_DSN` - Error monitoring
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry tracing

## Development Scripts

```bash
# Backend
npm run dev          # Development with nodemon
npm run print:version # Display version information
npm test            # Run test suite

# Version endpoint
curl http://localhost:5000/version
```

## Documentation

- [Site Manual](docs/SITE_MANUAL.md) - Complete operational documentation
- [Changelog](docs/CHANGELOG.md) - Version history
- [Config Order](docs/CONFIG_INIT_ORDER.md) - Configuration initialization guide

## Features

- JWT authentication with refresh tokens
- Rate limiting with Redis backing
- OpenTelemetry tracing and metrics
- Feature flags and caching
- Job queue processing
- Comprehensive validation and security middleware

## Architecture

- **Backend**: Node.js/Express with MongoDB
- **Frontend**: React with Vite
- **Infrastructure**: Redis for caching/sessions, Cloudinary for images
- **Payments**: Stripe integration
- **Monitoring**: Sentry error tracking, OpenTelemetry observability