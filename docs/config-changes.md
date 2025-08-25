# Configuration Changes - Quick Wins Phase 1

This document outlines new environment variables and configuration changes introduced in the Quick Wins Phase 1 implementation.

## New Environment Variables

### JWT Security Configuration
- **`JWT_ISSUER`** (optional): JWT issuer claim for token validation
- **`JWT_AUDIENCE`** (optional): JWT audience claim for token validation  
- **`REQUIRE_JWT_CLAIMS`** (optional): Set to `"1"` to enforce issuer/audience validation (default: disabled)

### Logging Configuration
- **`LOG_LEVEL`** (optional): Logging level - `"debug"`, `"info"`, `"warn"`, `"error"`, `"fatal"` (default: `"info"`)
- **`LOG_PRETTY`** (optional): Set to `"1"` to enable pretty-printed logs for development (default: JSON lines)

### Graceful Shutdown
- **`SHUTDOWN_TIMEOUT_MS`** (optional): Maximum time in milliseconds to wait for graceful shutdown (default: `10000`)

### Version Information (Optional)
- **`GIT_SHA`** (optional): Git commit SHA for health endpoint (auto-detected from Vercel if available)

## Behavioral Changes

### Session Management
- **Refresh Token Rotation**: Refresh tokens now rotate on each use with a 7-day sliding window
- **Reuse Detection**: Attempting to reuse an old refresh token will revoke all user sessions
- **Session Expiry**: Reduced from 30 days to 7 days for enhanced security
- **Secure Cookies**: Session cookies now use `HttpOnly`, `Secure` (HTTPS), and `SameSite=Strict` (fallback to `Lax`)

### Token Security
- Access tokens now have a fixed 15-minute expiry
- Refresh tokens are stored as SHA-256 hashes
- JWT claims validation (issuer/audience) when `REQUIRE_JWT_CLAIMS=1`

### Rate Limiting
- **Register**: 5 attempts per hour per IP
- **Login**: 10 attempts per minute per IP, with 5 failed attempts per IP+email combination
- **Password Reset**: 3 attempts per 15 minutes per IP

### Performance
- **Compression**: Responses >1KB are compressed using gzip/brotli
- **Caching**: 
  - API responses: `Cache-Control: no-store` (no caching)
  - Public assets/thumbnails: `Cache-Control: public, max-age=300, stale-while-revalidate=60` (5-minute cache)
- **ETag**: Enabled for response caching

### Health Endpoints
- **`/health`**: Enhanced with uptime, version, gitSha, timestamp, and environment
- **`/healthz`**: Same as `/health` but without environment information

### Logging
- Structured JSON logging with Pino
- Request/response logging with timing, status codes, and user context
- Error logging with stack traces and request context

## Migration Notes

### Breaking Changes
- Existing refresh tokens will be invalid due to schema changes (users will need to re-login)
- Session expiry reduced from 30 to 7 days

### Recommended Production Settings
```bash
# Security
REQUIRE_JWT_CLAIMS=1
JWT_ISSUER=https://yourdomain.com
JWT_AUDIENCE=teesfromthepast-app

# Logging
LOG_LEVEL=info
LOG_PRETTY=0

# Graceful shutdown
SHUTDOWN_TIMEOUT_MS=15000
```

### Development Settings
```bash
# Pretty logging for development
LOG_PRETTY=1
LOG_LEVEL=debug

# Optional: Disable JWT claims validation for development
REQUIRE_JWT_CLAIMS=0
```

## Monitoring

### Health Check
Monitor `/healthz` endpoint for service health:
```bash
curl http://localhost:5000/healthz
```

Expected response:
```json
{
  "ok": true,
  "uptime": 3600,
  "version": "1.0.0", 
  "gitSha": "abc123...",
  "time": "2024-01-15T10:30:00.000Z"
}
```

### Logs
- All logs are now in structured JSON format
- Use `LOG_PRETTY=1` for human-readable logs during development
- Monitor error logs for security violations (token reuse, failed auth attempts)

### Rate Limiting
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Window reset time (Unix timestamp)
  - `Retry-After`: Seconds to wait when rate limited (429 responses)