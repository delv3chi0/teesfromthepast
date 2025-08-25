# Tees From The Past

A full-stack e-commerce platform for vintage and custom t-shirt designs.

## Project Structure

```
├── backend/           # Node.js Express API server
├── frontend/          # React + Vite frontend application  
├── docs/              # Project documentation
└── scripts/           # Build and deployment scripts
```

## Quick Start

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev
```

### Frontend Setup  
```bash
cd frontend
npm install
npm run dev
```

## Configuration Updates

### Environment Variables

See [docs/config-changes.md](docs/config-changes.md) for detailed configuration options.

#### Security & JWT
- `JWT_SECRET` - Required JWT signing secret
- `JWT_ISSUER` - Optional JWT issuer claim
- `JWT_AUDIENCE` - Optional JWT audience claim  
- `REQUIRE_JWT_CLAIMS` - Set to "1" to enforce issuer/audience validation

#### Logging
- `LOG_LEVEL` - Logging level (debug, info, warn, error, fatal)
- `LOG_PRETTY` - Set to "1" for pretty-printed logs (development)

#### Performance & Operations
- `SHUTDOWN_TIMEOUT_MS` - Graceful shutdown timeout (default: 10000ms)
- `GIT_SHA` - Git commit SHA for health endpoints

### Quick Wins Phase 1 Features

This project includes security, performance, and observability enhancements:

**Security Enhancements:**
- JWT refresh token rotation with 7-day sliding window
- Refresh token reuse detection and session revocation
- Enhanced rate limiting with abuse detection
- Secure cookie configuration (HttpOnly, Secure, SameSite)

**Performance Improvements:**
- Response compression (gzip/brotli) for content >1KB
- Smart caching headers (no-store for APIs, 5min for assets)
- ETag support for conditional requests

**Observability:**
- Structured JSON logging with Pino
- Request/response tracking with timing and context
- Enhanced health endpoints with version and uptime info
- Graceful shutdown with proper cleanup

**Rate Limiting:**
- Register: 5 attempts/hour per IP
- Login: 10 attempts/min per IP, 5 failed attempts per IP+email
- Password reset: 3 attempts per 15 minutes per IP

## Health Monitoring

Check application health:
```bash
curl http://localhost:5000/healthz
```

Response includes uptime, version, git SHA, and timestamp.

## Development

### Logging
- Use `LOG_PRETTY=1` for readable logs during development
- Set `LOG_LEVEL=debug` for verbose logging
- All logs are structured JSON in production

### Security Testing
- Test refresh token rotation by inspecting session cookies
- Verify rate limiting by exceeding attempt thresholds
- Check CORS configuration with cross-origin requests

## Documentation

- [Configuration Changes](docs/config-changes.md) - Environment variables and behavioral changes
- [Email Domain Setup](docs/email-domain-setup.md) - SPF, DKIM, DMARC configuration
- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Changelog](docs/CHANGELOG.md) - Version history and changes

## Production Deployment

### Recommended Environment Variables
```bash
# Security
REQUIRE_JWT_CLAIMS=1
JWT_ISSUER=https://yourdomain.com
JWT_AUDIENCE=teesfromthepast-app

# Logging  
LOG_LEVEL=info
LOG_PRETTY=0

# Operations
SHUTDOWN_TIMEOUT_MS=15000
```

### Health Checks
Configure your load balancer or monitoring to check `/healthz` endpoint.

### Email Setup
Follow [docs/email-domain-setup.md](docs/email-domain-setup.md) for proper SPF/DKIM/DMARC configuration.

## Contributing

1. Follow existing code style and patterns
2. Add tests for new functionality  
3. Update documentation for configuration changes
4. Use structured logging instead of console.log
5. Follow security best practices for authentication and data handling

## License

[Your License Here]