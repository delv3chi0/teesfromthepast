# Admin Console Documentation

## Dynamic Admin Console Features

The Dynamic Admin Console provides real-time operational monitoring and configuration management for the teesfromthepast application. All dynamic settings are ephemeral (in-memory only) and will be lost on server restart.

## Navigation

The admin console is accessible to users with admin privileges at `/admin`. The console includes both static management tabs and new operational tabs:

### Static Management Tabs
- **Dashboard** - Application metrics and overview
- **Users** - User management 
- **Orders** - Order management
- **Designs** - Design management
- **Inventory** - Product inventory management
- **Devices** - Active session management

### Operational Tabs (Dynamic)
- **Metrics** - System metrics monitoring
- **Rate Limiting** - Dynamic rate limit configuration
- **Security** - Runtime security settings
- **Health** - System health and readiness monitoring
- **Tracing** - Request ID tracing
- **Config** - Complete runtime configuration snapshot
- **Enhanced Audit Logs** - Real-time audit log monitoring with filtering
- **Audit Logs** - Basic audit log functionality

## Backend API Endpoints

### Runtime Configuration
- `GET /api/admin/runtime/config` - Get complete runtime configuration snapshot
- `PUT /api/admin/runtime/rate-limit` - Update rate limiting configuration
- `PUT /api/admin/runtime/security` - Update security configuration

### Audit Logs  
- `GET /api/admin/audit/categories` - Get available audit log categories
- `GET /api/admin/audit/logs` - Get filtered audit logs

### Health and Monitoring
- `GET /health` - Enhanced health endpoint with runtime information
- `GET /readiness` - Readiness endpoint with dependency checks
- `GET /metrics` - Prometheus metrics (if enabled)

## Features by Tab

### Metrics Tab

**Purpose**: Monitor system metrics in Prometheus format

**Features**:
- View raw Prometheus metrics data
- Parse and group metrics by category
- Auto-refresh functionality (10-second interval)
- Manual refresh

**Usage**:
```bash
# View metrics via API
curl -X GET http://localhost:5000/metrics
```

**Fallback**: Shows warning if metrics are disabled or unavailable

### Rate Limiting Tab

**Purpose**: Configure dynamic rate limiting settings

**Features**:
- Change rate limiting algorithm (fixed, sliding, token_bucket)
- Adjust global rate limits (max requests per time window)
- Configure path-specific overrides
- Configure role-based overrides
- Real-time application of changes

**Configuration Structure**:
```json
{
  "algorithm": "fixed|sliding|token_bucket",
  "globalMax": 120,
  "windowMs": 60000,
  "overrides": [
    {
      "pathPrefix": "/api/upload",
      "max": 10,
      "algorithm": "sliding"
    }
  ],
  "roleOverrides": [
    {
      "role": "premium",
      "pathPrefix": "/api",
      "max": 500
    }
  ]
}
```

**Usage**:
```bash
# Update rate limiting
curl -X PUT http://localhost:5000/api/admin/runtime/rate-limit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"algorithm": "sliding", "globalMax": 200}'
```

**Priority**: Role Override > Path Override > Global Settings

### Security Tab

**Purpose**: Configure runtime security headers

**Features**:
- Toggle CSP Report-Only mode
- Enable/disable Cross-Origin Embedder Policy (COEP)
- Immediate application to new requests

**Configuration Structure**:
```json
{
  "cspReportOnly": true,
  "enableCOEP": false
}
```

**Usage**:
```bash
# Update security settings
curl -X PUT http://localhost:5000/api/admin/runtime/security \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"cspReportOnly": false}'
```

### Health Tab

**Purpose**: Monitor system health and readiness

**Features**:
- Overall health status monitoring
- Readiness checks for dependencies
- System uptime and version information
- Runtime configuration status
- Auto-refresh functionality (10-second interval)

**Information Displayed**:
- Health status (healthy/unhealthy)
- Uptime, version, commit, build time
- Runtime rate limit algorithm and metrics status
- Redis connection status
- Readiness status and dependency checks

### Tracing Tab

**Purpose**: Monitor request ID generation and tracking

**Features**:
- View recent request IDs (newest first)
- Ring buffer of last 200 request IDs
- Relative and absolute timestamps
- Auto-refresh functionality (5-second interval)

**Request ID Usage**: Request IDs are included in response headers as `X-Request-Id` (configurable) and help trace requests through the system for debugging.

### Config Tab

**Purpose**: View complete runtime configuration snapshot

**Features**:
- Configuration summary with key metrics
- Complete JSON configuration export
- Copy to clipboard functionality
- Download as JSON file
- Read-only view of all runtime settings

### Enhanced Audit Logs Tab

**Purpose**: Real-time audit log monitoring with advanced filtering

**Features**:
- Filter by category (exact match)
- Search by message or metadata (case-insensitive)
- Configurable result limits (50-500)
- Tail mode with 5-second auto-refresh
- Expandable rows showing full metadata
- Relative and absolute timestamps

**Filter Parameters**:
- `category` - Filter by category (exact match)
- `q` - Search query (substring match on message or metadata)
- `limit` - Maximum results (default 100, max 500)
- `since` - ISO timestamp to filter logs after

**Usage**:
```bash
# Get audit logs with filters
curl -X GET "http://localhost:5000/api/admin/audit/logs?category=config_change&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get audit categories
curl -X GET http://localhost:5000/api/admin/audit/categories \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Manual Verification

### Rate Limiting Changes

1. Change rate limit algorithm to "sliding" with globalMax of 50
2. Make requests to any API endpoint
3. Check response headers for rate limit information:
   ```
   X-RateLimit-Limit: 50
   X-RateLimit-Remaining: 49
   X-RateLimit-Reset: 1640995200
   X-RateLimit-Algorithm: sliding
   ```

### Security Changes

1. Disable CSP Report-Only mode
2. Check response headers in browser developer tools
3. Verify `Content-Security-Policy` header (instead of `Content-Security-Policy-Report-Only`)

### Audit Logging

1. Perform admin actions (change rate limits, access tabs)
2. View Enhanced Audit Logs tab
3. Filter by category "config_change" or "admin_access"
4. Verify log entries show the actions taken

## Fallback Behavior

If the backend does not support dynamic configuration endpoints:

- **Metrics Tab**: Shows warning about metrics being disabled
- **Rate Limiting Tab**: Shows warning about using static configuration only
- **Security Tab**: Shows warning about using static configuration only  
- **Health Tab**: Still functions (uses standard health endpoints)
- **Tracing Tab**: Shows warning about request IDs not being tracked
- **Config Tab**: Shows warning about runtime configuration not being available
- **Enhanced Audit Logs**: Shows warning about using basic audit functionality only

## Important Notes

### Ephemeral Configuration
- All dynamic configuration changes are stored in memory only
- Changes are lost when the server restarts
- No persistence layer is used for operational settings
- Default behavior is identical to static configuration when not using overrides

### Security Considerations
- All endpoints require admin authentication
- Security changes affect all users immediately
- Rate limiting changes apply to new requests immediately
- Audit logs track all configuration changes with user attribution

### Performance Impact
- In-memory ring buffers have configurable sizes
- Default ring buffer sizes: 200 request IDs, 500 audit logs
- Auto-refresh intervals are configurable in the UI
- Metrics parsing is performed client-side to reduce server load

### Monitoring Best Practices
- Use tail mode in Enhanced Audit Logs for real-time monitoring
- Monitor health status for dependency failures
- Set appropriate rate limits based on traffic patterns
- Review audit logs regularly for security events

## Environment Variables

The following environment variables affect dynamic configuration defaults:

- `RATE_LIMIT_ALGORITHM` - Default algorithm (fixed|sliding|token_bucket)
- `RATE_LIMIT_MAX` - Default global max requests (default: 120)
- `RATE_LIMIT_WINDOW` - Default time window in ms (default: 60000)
- `CSP_REPORT_ONLY` - Default CSP report-only mode (default: true)
- `ENABLE_COEP` - Default COEP enablement (default: false)
- `REQUEST_ID_HEADER` - Request ID header name (default: X-Request-Id)
- `ENABLE_METRICS` - Enable metrics endpoint (default: false)
- `TRACING_RING_SIZE` - Request ID ring buffer size (default: 200)
- `AUDIT_RING_SIZE` - Audit log ring buffer size (default: 500)

## Support and Troubleshooting

### Common Issues

1. **"Runtime configuration not available"** - Backend doesn't support dynamic endpoints
2. **"Failed to fetch configuration"** - Network error or auth issue
3. **Rate limit changes not applying** - Check for override precedence
4. **Metrics not showing** - Ensure `ENABLE_METRICS=true` and Redis is available

### Debug Information

- Check browser console for API errors
- Verify admin authentication token
- Check backend logs for dynamic config errors
- Use browser network tab to inspect API responses