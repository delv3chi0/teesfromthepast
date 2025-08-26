# Admin Console UI Enhancement Documentation

## Overview

The Admin Console has been enhanced with new operational and security capabilities that provide a comprehensive GUI for inspection and runtime adjustments. All configuration changes are **memory-only** and will be lost on server restart.

## New Admin Tabs

### 1. Metrics Tab
- **Purpose**: Live monitoring of system and application metrics
- **Features**:
  - Live Prometheus metrics scraping and parsing
  - System metrics display (uptime, memory, platform info)
  - Categorized metrics tables (counters, gauges, histograms)
  - Graceful fallback when metrics are disabled
- **Requirements**: Metrics collection must be enabled (`ENABLE_METRICS=true`)

### 2. Rate Limiting Tab  
- **Purpose**: View and adjust rate limiting configuration
- **Features**:
  - Algorithm selection (fixed, sliding, token_bucket)
  - Global rate limit adjustments
  - Window duration configuration
  - Path and role-based override viewing
  - Real-time configuration updates
- **Safety**: All changes are memory-only and validated server-side

### 3. Security Tab
- **Purpose**: Manage security headers and policies
- **Features**:
  - Content Security Policy (CSP) report-only toggle
  - Cross-Origin Embedder Policy (COEP) enable/disable
  - Security headers overview
  - Configuration recommendations
- **Warning**: Changes affect live traffic immediately

### 4. Health & Readiness Tab
- **Purpose**: Monitor system health and readiness status
- **Features**:
  - Live health and readiness endpoint monitoring
  - Auto-refresh with configurable intervals
  - System information display
  - Configuration status overview
- **Auto-refresh**: 5s, 10s, 30s, or 60s intervals available

### 5. Config Inspector Tab
- **Purpose**: View complete runtime configuration
- **Features**:
  - Structured configuration display by category
  - JSON export and copy-to-clipboard functionality
  - Dynamic override status indicators
  - Configuration source documentation
- **Use Case**: Debugging and documentation purposes

### 6. Request Tracing Tab
- **Purpose**: Understand request ID generation and usage
- **Features**:
  - Request ID header configuration display
  - Sample request ID generation
  - Integration examples and documentation
  - Tracing workflow explanation
- **Educational**: Helps with debugging and log correlation

### 7. Enhanced Audit Logs Tab
- **Purpose**: Improved audit log viewing with advanced filtering
- **Features**:
  - Category-based filtering with tabs
  - Full-text search across log entries
  - Backwards-compatible with existing functionality
  - Real-time log access via ring buffer
- **Fallback**: Uses legacy API if enhanced features unavailable

## API Endpoints

### Runtime Configuration
- `GET /api/admin/runtime/config` - Get complete runtime configuration
- `PUT /api/admin/runtime/rate-limit` - Update rate limiting (memory-only)
- `PUT /api/admin/runtime/security` - Update security headers (memory-only)
- `GET /api/admin/runtime/overrides` - View current dynamic overrides

### Enhanced Audit Logs
- `GET /api/admin/audit/categories` - Get available audit categories
- `GET /api/admin/audit/logs` - Get filtered audit logs with search

## Safety Features

### Memory-Only Changes
- All configuration changes are stored in memory only
- Changes are lost on server restart
- No persistence to database or environment files
- Clearly labeled throughout the UI

### Server-Side Validation
- Numeric limits are validated and sanitized
- Minimum and maximum bounds enforced
- Invalid algorithms rejected
- Boolean values properly parsed

### Graceful Fallbacks
- Components handle missing backend features gracefully
- Enhanced features fall back to legacy APIs when unavailable
- Informative error messages and placeholder content
- No breaking changes to existing functionality

## Usage Guidelines

### Making Configuration Changes
1. Navigate to the appropriate admin tab
2. Make desired changes using the UI controls
3. Changes are applied immediately (optimistic updates)
4. Toast notifications confirm success or report errors
5. Use "Refresh" buttons to verify current state

### Monitoring and Debugging
1. Use the Health tab for real-time system monitoring
2. Check the Metrics tab for performance insights
3. Review the Config Inspector for complete configuration state
4. Use Request Tracing for debugging request flows
5. Enhanced Audit Logs for detailed activity tracking

### Best Practices
- Test configuration changes in staging before production
- Monitor system behavior after making changes
- Use the Config Inspector to document current settings
- Keep track of changes since they're not persisted
- Restart the server to revert all dynamic overrides

## Troubleshooting

### Missing Features
If certain features don't appear or show errors:
- Check that the backend has been updated with the new endpoints
- Verify that required environment variables are set
- Look for error messages in browser console
- Components gracefully fall back to legacy functionality

### Configuration Not Applied
If changes don't seem to take effect:
- Check for error toast notifications
- Verify changes using the Config Inspector
- Refresh the page to see current server state
- Check server logs for validation errors

### Metrics Not Available
If the Metrics tab shows errors:
- Ensure `ENABLE_METRICS=true` in environment
- Check that the `/metrics` endpoint is accessible
- Verify Prometheus metrics are being collected
- Check for CORS or authentication issues

## Technical Implementation

### Frontend Architecture
- New components in `src/pages/admin/` directory
- Reusable UI components in `src/components/admin/common/`
- Centralized API calls in `src/api/adminRuntime.js`
- Consistent Chakra UI styling with existing admin interface

### Backend Architecture
- Dynamic configuration layer in `backend/config/dynamicConfig.js`
- Consolidated routes in `backend/routes/adminDynamic.js`
- Enhanced rate limiting middleware integration
- Audit logger with ring buffer for UI access

### Security Considerations
- All endpoints require admin authentication
- Input validation and sanitization on all updates
- No persistent storage of sensitive configuration
- Rate limiting applies to admin endpoints
- Audit logging of all configuration changes

## Future Enhancements

The following features are planned for future releases:
- Persistent configuration storage (Redis/database)
- Live streaming audit logs via WebSocket/SSE
- Role-based access control for specific admin tabs
- Editable OpenAPI viewer and specification diff
- Advanced metrics visualization and alerting
- Configuration change history and rollback