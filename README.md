# Tees From The Past

A full-stack e-commerce application for custom t-shirt designs and vintage merchandise.

## Features

- Custom t-shirt design platform
- User authentication and registration
- Shopping cart and checkout functionality
- Admin panel for order and design management
- Rate limiting and security features
- Version tracking and monitoring

## API Documentation

### Operational Endpoints

#### GET /health
Health check endpoint for monitoring.

**Response:**
```
Status: 200 OK
Body: "OK"
```

#### GET /version
Returns application version and build information.

**Response:**
```json
{
  "commit": "4d5de25",
  "buildTime": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "env": {
    "mode": "production",
    "node": "v20.19.4"
  }
}
```

### Rate Limiting

The application implements Redis-backed global rate limiting to protect against abuse:

- **Default Limit:** 120 requests per 60-second window
- **Identification:** By user ID (if authenticated) or IP address
- **Exempt Paths:** `/health`, `/readiness` (configurable)
- **Headers:** Standard rate limit headers are included in responses

#### Rate Limit Headers

Active rate limiting includes these headers:
- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Remaining requests in current window  
- `X-RateLimit-Reset`: Unix timestamp when window resets

#### Rate Limit Exceeded (429)

When limits are exceeded:
```json
HTTP 429 Too Many Requests
Retry-After: 30

{
  "error": {
    "code": "RATE_LIMITED", 
    "message": "Rate limit exceeded",
    "retryAfterSeconds": 30
  }
}
```

#### Disabled Rate Limiting

When Redis is unavailable, rate limiting is disabled and requests include:
```
X-RateLimit-Disabled: true
```

## Environment Variables

### Core Application
- `NODE_ENV` - Environment mode (development, production, test) [default: development]
- `PORT` - Server port [default: 5000]

### Database
- `MONGO_URI` - MongoDB connection string (required)

### Authentication & Security  
- `JWT_SECRET` - JWT signing secret, min 32 chars (required)

### Payment Processing
- `STRIPE_SECRET_KEY` - Stripe secret key (required)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (required)

### External Services
- `REDIS_URL` - Redis connection string [optional]
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (required)
- `CLOUDINARY_API_KEY` - Cloudinary API key (required)  
- `CLOUDINARY_API_SECRET` - Cloudinary API secret (required)

### Rate Limiting
- `RATE_LIMIT_MAX` - Max requests per window [default: 120]
- `RATE_LIMIT_WINDOW` - Window size in milliseconds [default: 60000]
- `RATE_LIMIT_EXEMPT_PATHS` - Comma-separated exempt paths [default: "/health,/readiness"]
- `RATE_LIMIT_REDIS_PREFIX` - Redis key prefix [default: "rl:"]

### Version Information
- `GIT_COMMIT` - Git commit hash [optional, auto-detected]
- `BUILD_TIME` - Build timestamp [optional, auto-detected]

### Logging & Monitoring
- `LOG_LEVEL` - Logging level (debug, info, warn, error) [default: info]
- `SENTRY_DSN` - Sentry error monitoring URL [optional]
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint [optional]

### Application Limits
- `JSON_LIMIT_MB` - JSON body size limit [default: 25]
- `PRINTFILE_MAX_MB` - Print file size limit [default: 22] 
- `CLOUDINARY_IMAGE_MAX_MB` - Image upload limit [default: 10]
- `DB_SLOW_MS` - Slow query threshold [default: 1000]

### Optional Services
- `RESEND_API_KEY` - Email service API key [optional]
- `FEATURE_FLAG_FILE` - Feature flags file path [optional]

## Scripts

- `npm run print:version` - Display version information
- `npm run print:version -- --json` - Display version as JSON

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install` 
3. Copy `.env.example` to `.env` and configure environment variables
4. Start the development server: `npm run dev`

## License

Private repository - All rights reserved.