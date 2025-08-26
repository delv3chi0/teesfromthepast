# Admin Console User Guide

The Admin Console provides comprehensive monitoring and dynamic configuration capabilities for the Tees From The Past application. This guide covers the new operational tabs added for dynamic runtime management.

## Overview

The admin console includes both traditional management tabs (Users, Orders, Designs, etc.) and new operational tabs for real-time monitoring and configuration:

- **Metrics** - System performance monitoring
- **Rate Limiting** - Dynamic rate limit configuration  
- **Security** - Security headers and policy management
- **Health** - System health and readiness monitoring
- **Config** - Runtime configuration viewer
- **Tracing** - Request ID tracking and tracing
- **Live Audit** - Real-time audit log monitoring

## Key Features

### Dynamic Configuration
- **Ephemeral**: All dynamic changes are stored in memory and reset on server restart
- **Live Updates**: Changes take effect immediately without requiring restarts
- **Precedence**: Dynamic overrides > Environment variables > Default values
- **Safe**: No permanent changes to production configuration

### Ring Buffer Architecture
- **Audit Logs**: Latest 500 entries stored in memory for quick access
- **Request IDs**: Recent request IDs tracked for debugging
- **Categories**: Automatic categorization of audit events

## Admin Tabs Guide

### Metrics Tab
Monitor system performance with Prometheus-compatible metrics:

- **Auto-refresh**: Toggle 10-second auto-refresh
- **Metrics Parsing**: Automatic parsing of Prometheus exposition format
- **Categories**: Counters, Gauges, and Histograms displayed separately
- **Fallback**: Raw metrics display if parsing fails

**Manual Verification:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/metrics
```

### Rate Limiting Tab
Configure dynamic rate limiting overrides:

- **Global Settings**: Override max requests, window duration, and algorithm
- **Path Overrides**: Set specific limits for API paths (e.g., `/api/upload`)
- **Role Overrides**: Different limits for admin vs regular users
- **Algorithms**: Choose between fixed, sliding window, or token bucket

**Manual Verification:**
```bash
# Make requests and check headers
curl -I http://localhost:5000/api/admin/runtime/config
# Look for X-RateLimit-* headers with updated values
```

### Security Tab  
Manage security headers and policies:

- **CSP Report-Only**: Toggle between enforcing and report-only mode
- **COEP Toggle**: Enable/disable Cross-Origin Embedder Policy
- **Live Preview**: See effective CSP policy with current settings
- **Header Display**: View all security headers that will be sent

**Manual Verification:**
```bash
# Check security headers
curl -I http://localhost:5000/api/health
# Look for Content-Security-Policy and Cross-Origin-Embedder-Policy headers
```

### Health Tab
Monitor system health and dependencies:

- **Health Status**: Overall system health with uptime
- **Readiness**: Service readiness for traffic
- **Dependencies**: Redis connection status
- **Version Info**: Build information and environment details
- **Auto-refresh**: 15-second intervals available

### Config Tab
View complete runtime configuration:

- **Full Snapshot**: All current configuration values
- **Section Breakdown**: Individual configuration areas
- **Copy Support**: JSON copy-to-clipboard functionality
- **Precedence Guide**: Understanding configuration hierarchy

### Tracing Tab
Track request IDs and tracing:

- **Recent Requests**: Ring buffer of latest request IDs
- **Request Headers**: Shows current request ID header name
- **Usage Examples**: curl commands for custom request ID propagation
- **Real-time Updates**: Auto-refresh for live request tracking

### Live Audit Tab
Monitor audit events in real-time:

- **Ring Buffer**: Latest audit events from memory
- **Filtering**: By category, search query, and limit
- **Tail Mode**: Live 5-second polling for new events
- **Categories**: auth, admin, user, system, error, general
- **Search**: Full-text search across messages, actors, and actions

## Configuration Precedence

Understanding how configuration values are determined:

1. **Dynamic Overrides** (highest priority) - Set via admin console
2. **Environment Variables** - Set in .env or deployment config  
3. **Default Values** (lowest priority) - Hardcoded fallbacks

## Making Changes Persistent

**Important**: Dynamic overrides are ephemeral and reset on restart.

To make changes permanent:
1. Note the dynamic configuration you want to keep
2. Update corresponding environment variables in your deployment
3. Redeploy or restart the application
4. Verify the environment variables are active

## Security Considerations

### Access Control
- All operational tabs require admin privileges
- Protected by existing authentication middleware
- Session-based access with JWT tokens

### Data Sensitivity
- Ring buffers contain recent operational data
- Audit logs may include user information
- Configuration snapshots show internal settings
- No persistent storage of sensitive overrides

### Production Usage
- Dynamic overrides are safe for temporary changes
- Use for emergency adjustments and testing
- Always update environment variables for permanent changes
- Monitor for unauthorized configuration changes

## Troubleshooting

### Common Issues

**Tabs show "Failed to fetch":**
- Check if you have admin privileges
- Verify backend endpoints are mounted correctly
- Check browser console for authentication errors

**Dynamic changes not taking effect:**
- Verify changes were saved successfully (check for toast notifications)
- Refresh the Config tab to see current values
- Check server logs for configuration errors

**Metrics tab shows raw text:**
- This is normal for non-Prometheus format metrics
- Raw metrics are still functional for monitoring
- Check if metrics endpoint returns expected format

### Verification Commands

Test dynamic configuration endpoints:
```bash
# Get current config
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/admin/runtime/config

# Update rate limiting
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"globalMax": 200}' \
  http://localhost:5000/api/admin/runtime/rate-limit

# Check health endpoints
curl http://localhost:5000/health
curl http://localhost:5000/readiness
```

## Future Enhancements

Planned improvements for future releases:
- WebSocket/SSE streaming for real-time updates
- Enhanced metrics visualization with charts
- Configuration diff tracking
- Audit log export functionality
- Advanced filtering and alerting

## Support

For technical support or questions about the admin console:
1. Check server logs for error details
2. Verify environment configuration
3. Test with curl commands for API verification
4. Review authentication and authorization settings