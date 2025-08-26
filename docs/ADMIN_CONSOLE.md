# Admin Console Dynamic Features

This document describes the dynamic admin console features that provide real-time configuration management and monitoring capabilities.

## Overview

The dynamic admin console extends the existing admin interface with operational tabs that allow administrators to:

- Monitor system metrics and health
- Dynamically configure rate limiting without restarts
- Toggle security headers in real-time
- View request tracing data
- Access complete runtime configuration
- Enhanced audit log filtering with tail mode

## Tab Structure

The admin console follows this tab order:

1. **Dashboard** - Existing business overview
2. **Users** - User management
3. **Orders** - Order management 
4. **Designs** - Design management
5. **Inventory** - Product inventory management
6. **Devices** - Session/device management
7. **Metrics** - System metrics dashboard (NEW)
8. **Rate Limiting** - Dynamic rate limit configuration (NEW)
9. **Security** - Security headers management (NEW)
10. **Health** - System health and readiness (NEW)
11. **Tracing** - Request ID tracing (NEW)
12. **Config** - Runtime configuration viewer (NEW)
13. **Audit Logs** - Enhanced audit log browser (NEW)

## Backend Features

### Dynamic Runtime Configuration

**File:** `backend/config/dynamicConfig.js`

Provides in-memory runtime configuration that can be modified without restarting the server:

- Rate limiting configuration (algorithm, limits, overrides)
- Security settings (CSP mode, COEP)
- Request tracing (recent request IDs)
- Metrics configuration
- Version information
- Audit log ring buffer

**API Endpoints:**

- `GET /api/admin/runtime/config` - Get complete configuration snapshot
- `PUT /api/admin/runtime/rate-limit` - Update rate limiting settings
- `PUT /api/admin/runtime/security` - Update security settings
- `GET /api/admin/audit/categories` - Get audit log categories
- `GET /api/admin/audit/logs` - Get filtered audit logs

### Enhanced Middleware

#### Rate Limiter
- **File:** `backend/middleware/rateLimit.js`
- Dynamic configuration integration
- Precedence: Role overrides > Path overrides > Global settings
- Algorithm support: fixed, sliding, token-bucket

#### Security Headers
- **File:** `backend/middleware/securityHeaders.js`  
- Dynamic CSP report-only toggle
- Dynamic COEP enable/disable

#### Request ID
- **File:** `backend/middleware/requestId.js`
- Feeds request IDs to tracing ring buffer
- Configurable header name

### Audit Logger
- **File:** `backend/utils/audit.js`
- Enhanced with ring buffer for real-time access
- Maintains original database logging
- Server-side filtering by category and search

### Health Endpoints
- **File:** `backend/routes/health.js`
- Include runtime configuration info
- Rate limit algorithm and metrics status

## Frontend Features

### API Helper
- **File:** `frontend/src/api/adminRuntime.js`
- Handles all dynamic admin API calls
- Graceful error handling and backend absence detection
- Prometheus metrics parsing

### Common UI Components
- **SectionCard** - Consistent section styling
- **KeyValueGrid** - Key-value data display
- **JSONPreview** - JSON viewer with copy/download
- **EditableNumberRow** - Inline number editing
- **ToggleRow** - Switch controls with feedback

### Enhanced Audit Log Panel
- **File:** `frontend/src/components/admin/Audit/AuditLogPanel.jsx`
- Real-time filtering by category and search
- Tail mode with 5-second auto-refresh
- Expandable row details
- Newest-first ordering

### New Admin Pages

#### Metrics (`AdminMetrics.jsx`)
- Prometheus exposition format parsing
- Grouped by metric type (counters, gauges, histograms)
- Auto-refresh with 10-second interval
- Graceful fallback for disabled/missing metrics

#### Rate Limiting (`AdminRateLimiting.jsx`)
- Global algorithm and limit configuration
- Path-based overrides management
- Role-based overrides management
- Real-time validation and feedback

#### Security (`AdminSecurity.jsx`)
- CSP Report-Only toggle
- COEP enable/disable
- Current mode display
- Security guidelines

#### Health (`AdminHealth.jsx`)
- Health and readiness status
- Dependency checks (Redis)
- System information display
- Runtime configuration status

#### Tracing (`AdminTracing.jsx`)
- Recent request IDs display
- Request ID header configuration
- Relative timestamps
- Auto-refresh capability

#### Config (`AdminConfig.jsx`)
- Complete runtime configuration viewer
- Section-based breakdowns
- Copy to clipboard functionality
- Download as JSON file

## Fallback Behavior

When backend endpoints are not available:
- New tabs show informational messages
- Existing functionality remains unaffected
- Audit Logs tab falls back to original implementation
- Clear messaging about required backend features

## Important Notes

### Ephemeral Configuration
- All dynamic changes are **in-memory only**
- Configuration is lost on server restart
- For persistence, update environment variables or config files

### Security Considerations
- All dynamic endpoints require admin authentication
- Changes are logged in audit trail
- Security headers apply immediately to subsequent requests

### Performance
- Ring buffers have size limits (configurable via environment)
- Auto-refresh intervals are conservative (5-30 seconds)
- Backend availability is checked on admin page load

## Verification Steps

1. Check dynamic rate limit headers:
   ```bash
   curl -I https://your-domain/api/health
   # Look for X-RateLimit-Algorithm header
   ```

2. Verify security header changes:
   ```bash
   curl -I https://your-domain/
   # Check CSP headers change between report-only and enforcing
   ```

3. Test audit log filtering:
   - Use category filters in Audit Logs tab
   - Search for specific terms
   - Enable tail mode to see real-time updates

4. Monitor metrics endpoint:
   ```bash
   curl https://your-domain/api/metrics
   # Should return Prometheus exposition format
   ```

## Development

The implementation follows existing patterns:
- Uses Chakra UI for consistency
- Follows existing error handling patterns
- Integrates with existing auth middleware
- Maintains backward compatibility

For local development, ensure all environment variables are set and the backend is running with the enhanced features deployed.