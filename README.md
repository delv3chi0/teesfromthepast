# TeesFromThePast

A comprehensive e-commerce platform for custom t-shirt designs with advanced operational features.

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB instance
- Redis instance (optional, for caching and rate limiting)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd teesfromthepast
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies  
```bash
cd ../frontend
npm install
```

4. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start the backend
```bash
cd backend
npm start
```

6. Start the frontend (in a new terminal)
```bash
cd frontend
npm run dev
```

## Environment Variables

### Core Application
- `NODE_ENV` - Environment mode (development/production/test)
- `PORT` - Backend server port (default: 5000)

### Database & Cache
- `MONGO_URI` - MongoDB connection string (required)
- `REDIS_URL` - Redis connection string (optional)

### Authentication & Security
- `JWT_SECRET` - JWT signing secret (min 32 characters, required)

### Rate Limiting
- `RATE_LIMIT_WINDOW` - Rate limit window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX` - Maximum requests per window (default: 120)
- `RATE_LIMIT_EXEMPT_PATHS` - Comma-separated exempt paths (default: "/health,/readiness")
- `RATE_LIMIT_REDIS_PREFIX` - Redis key prefix for rate limiting (default: "rl:")

### External Services
- `STRIPE_SECRET_KEY` - Stripe secret key (required)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (required)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (required)
- `CLOUDINARY_API_KEY` - Cloudinary API key (required)
- `CLOUDINARY_API_SECRET` - Cloudinary API secret (required)

### Optional Features
- `SENTRY_DSN` - Error monitoring with Sentry
- `RESEND_API_KEY` - Email service with Resend
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry tracing
- `FEATURE_FLAG_FILE` - Feature flags configuration file

### Version Information
- `GIT_COMMIT` - Git commit SHA for version endpoint (auto-detected if not set)
- `BUILD_TIME` - Build timestamp for version endpoint (auto-generated if not set)

See `.env.example` for complete configuration template.

## API Endpoints

### Operational Endpoints
- `GET /health` - Health check (returns service status)
- `GET /readiness` - Readiness check (for deployment health)
- `GET /version` - Build and runtime metadata
- `GET /metrics` - Application metrics (may be gated)

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- Additional auth endpoints for 2FA, email verification

### Core Features
- `/api/upload` - File upload management
- `/api/mydesigns` - User design management
- `/api/storefront` - Product catalog
- `/api/checkout` - Order processing
- `/api/orders` - Order management
- `/api/admin/*` - Administrative functions

### Development
- `GET /api/dev/boom` - Error testing (non-production only)

## Rate Limiting

The application implements a two-tier rate limiting system:

### Global Baseline Rate Limiting
- Redis-backed fixed window algorithm
- Configurable limits via environment variables
- Fail-open design when Redis unavailable
- Path exemptions for operational endpoints
- Standard rate limit headers in responses

### Adaptive Rate Limiting
- Applied to specific route groups (auth, upload, etc.)
- Includes abuse detection and scoring
- Dynamic limit adjustment based on behavior patterns

## Features

### Core Platform
- Custom t-shirt design tools
- E-commerce checkout with Stripe integration
- User authentication with JWT
- File upload and image processing (Cloudinary)
- Order management and tracking

### Operational Features  
- Comprehensive error monitoring (Sentry)
- Structured logging with request tracing
- Health and readiness endpoints
- Application metrics and monitoring
- Feature flag system
- Caching layer with Redis
- Rate limiting and abuse protection

### Security & Quality
- Input validation and sanitization
- CORS protection
- Security headers (Helmet)
- Idempotency for critical operations
- Audit logging for admin actions
- CI/CD with quality gates

## Development

### Testing
```bash
cd backend
npm test
```

### Linting  
```bash
cd backend
npm run lint  # if available
```

### Database Migrations
Database schema is managed through Mongoose models. No separate migration system.

### Feature Flags
Configure feature flags in JSON file specified by `FEATURE_FLAG_FILE` environment variable.

## Deployment

### Environment Setup
1. Set all required environment variables
2. Ensure MongoDB and Redis are accessible
3. Configure external service credentials (Stripe, Cloudinary, etc.)

### Health Checks
- Use `GET /health` for basic health checks
- Use `GET /readiness` for deployment readiness verification
- Use `GET /version` to verify deployment version

### Monitoring
- Application metrics available at `/api/metrics`
- Error tracking via Sentry (if configured)
- Structured logs for observability

## Documentation

- See `docs/SITE_MANUAL.md` for comprehensive operational manual
- See `CHANGELOG.md` for version history and changes
- Environment variables documented in `.env.example`

## Architecture

- **Backend**: Node.js + Express + MongoDB + Redis
- **Frontend**: React + Vite
- **Authentication**: JWT with refresh token rotation
- **File Storage**: Cloudinary integration
- **Payments**: Stripe integration
- **Queue**: BullMQ for background jobs
- **Monitoring**: OpenTelemetry + Sentry

## Contributing

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for user-facing changes
4. Ensure CI/CD passes before merging

## License

[Add license information here]