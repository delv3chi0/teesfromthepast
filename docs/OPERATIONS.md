# Operations Manual

## Overview

This document provides operational guidance for the Tees From The Past platform, covering logging, metrics, tracing, backup procedures, monitoring, and alerting workflows.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Monitoring    │    │   Alerting      │
│                 │    │                 │    │                 │
│ • Structured    │───▶│ • Metrics API   │───▶│ • Error Rates   │
│   Logging       │    │ • Health Checks │    │ • Performance   │
│ • Trace IDs     │    │ • RUM Data      │    │ • Capacity      │
│ • Error         │    │ • Cache Stats   │    │ • Security      │
│   Tracking      │    │ • DB Metrics    │    │ • Backups       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Logging Architecture

### Structured Logging with Pino

**Log Format:**
```json
{
  "level": 30,
  "time": 1640995200000,
  "pid": 12345,
  "hostname": "app-server-01",
  "traceId": "trace-abc123",
  "spanId": "span-def456",
  "requestId": "req-789012",
  "userId": "user-345678",
  "sessionJti": "session-901234",
  "msg": "Request completed",
  "method": "GET",
  "url": "/api/products",
  "statusCode": 200,
  "duration": 150.25
}
```

**Log Levels:**
- `error` (50): Application errors, exceptions
- `warn` (40): Warning conditions, degraded performance
- `info` (30): General information, request/response
- `debug` (20): Detailed debugging information

**Correlation IDs:**
- `traceId`: OpenTelemetry trace identifier
- `spanId`: Current span within trace
- `requestId`: Unique request identifier
- `userId`: Authenticated user ID
- `sessionJti`: Session token identifier

### Request-Scoped Logging

**Usage in Routes:**
```javascript
export async function getUserOrders(req, res) {
  req.log.info('Fetching user orders', { userId: req.user.id });
  
  try {
    const orders = await Order.find({ user: req.user.id });
    req.log.info('Orders retrieved', { count: orders.length });
    res.json({ orders });
  } catch (error) {
    req.log.error('Failed to fetch orders', { error: error.message });
    throw error;
  }
}
```

### Log Aggregation

**Production Setup:**
1. Application logs sent to stdout/stderr
2. Container runtime captures logs
3. Log aggregation service (ELK, Datadog, etc.)
4. Structured search and analysis
5. Alerting on error patterns

## Metrics & Monitoring

### Application Metrics

**Endpoint: `/api/metrics`** (Admin only)

**System Metrics:**
```json
{
  "system": {
    "uptime": 3600.5,
    "memory": {
      "rss": 123456789,
      "heapTotal": 98765432,
      "heapUsed": 87654321,
      "external": 1234567
    },
    "pid": 12345,
    "nodeVersion": "v18.17.0",
    "platform": "linux"
  }
}
```

**Cache Metrics:**
```json
{
  "cache": {
    "hits": 850,
    "misses": 150,
    "hitRate": 85.0,
    "sets": 200,
    "deletes": 50,
    "errors": 2,
    "isConnected": true
  }
}
```

**Database Metrics:**
```json
{
  "database": {
    "total": 1000,
    "slow": 25,
    "slowThreshold": 1000,
    "slowQueryRate": 2.5,
    "averageResponseTime": 45.8,
    "responseTimeBuckets": {
      "0-100ms": 700,
      "100-500ms": 275,
      "500-1000ms": 20,
      "1000-5000ms": 4,
      "5000ms+": 1
    }
  }
}
```

### Real User Monitoring (RUM)

**Endpoint: `/api/rum/metrics`** (Admin only)

**Core Web Vitals:**
```json
{
  "stats": {
    "totalSamples": 5000,
    "metrics": {
      "lcp": {
        "samples": 1200,
        "p75": 2100,
        "p95": 3500,
        "p99": 4800
      },
      "fid": {
        "samples": 800,
        "p75": 85,
        "p95": 180,
        "p99": 280
      },
      "cls": {
        "samples": 1100,
        "p75": 0.08,
        "p95": 0.15,
        "p99": 0.22
      }
    }
  }
}
```

**Performance Thresholds:**
- **LCP (Largest Contentful Paint):**
  - Good: ≤ 2.5s
  - Needs Improvement: 2.5s - 4.0s
  - Poor: > 4.0s

- **FID (First Input Delay):**
  - Good: ≤ 100ms
  - Needs Improvement: 100ms - 300ms
  - Poor: > 300ms

- **CLS (Cumulative Layout Shift):**
  - Good: ≤ 0.1
  - Needs Improvement: 0.1 - 0.25
  - Poor: > 0.25

### Health Checks

**Application Health: `/health`**
```
HTTP 200 OK
Content: "OK"
```

**RUM Health: `/api/rum/health`**
```json
{
  "ok": true,
  "health": {
    "status": "ok",
    "totalEvents": 1500,
    "lastEvent": "2024-01-25T14:30:22Z",
    "memoryUsage": {
      "events": 1000,
      "aggregatedMetrics": 500
    }
  }
}
```

## Database Operations

### Slow Query Monitoring

**Configuration:**
```env
DB_SLOW_MS=1000  # Threshold in milliseconds
```

**Monitoring Output:**
```json
{
  "level": "warn",
  "msg": "Slow database query detected",
  "collection": "orders",
  "method": "find",
  "duration": "1250ms",
  "query": "{\"user\":\"507f1f77bcf86cd799439011\"}",
  "threshold": "1000ms"
}
```

### Index Optimization

**Run Index Audit:**
```bash
# Check current indexes vs schema
node bin/check-indexes.js

# Generate optimization script
node bin/check-indexes.js optimize.js
```

**Sample Output:**
```
📊 Auditing User
  Collection: users
  Documents: 10,500
  Size: 2.1 MB
  Index Size: 512 KB
  Indexes: 4
  🟡 MEDIUM - users
    Index: {"email":1,"emailVerifiedAt":1}
    Reason: Email verification queries
    Frequency: medium
```

## Backup & Recovery

### Automated Backups

**Schedule:** Daily at 2:00 AM UTC

**Backup Process:**
1. MongoDB dump with compression
2. Metadata manifest generation
3. Encryption with AES256
4. Upload to secure storage
5. Cleanup old backups (7+ days)

**Manual Backup:**
```bash
cd backend
./bin/backup-db.sh
```

### Restore Procedures

**Quick Restore:**
```bash
# Restore from latest backup
./bin/restore-db.sh --latest

# Preview restore (dry-run)
./bin/restore-db.sh --dry-run --latest
```

**Specific Backup:**
```bash
./bin/restore-db.sh backup_20240125_143022.tar.gz
```

**Emergency Restore:**
```bash
# Force restore with database drop
./bin/restore-db.sh --force --drop --latest
```

### Recovery Targets

- **RPO (Recovery Point Objective):** 24 hours
- **RTO (Recovery Time Objective):** 2 hours
- **Availability Target:** 99.9% uptime

## Security Monitoring

### Rate Limiting & Abuse Detection

**Adaptive Rate Limits:**
- IP-based token buckets
- User-based rate limits
- Route-specific limits
- Abuse score tracking

**Abuse Detection Headers:**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995800
X-Abuse-Score: 25
```

**Monitoring Abuse Events:**
```json
{
  "level": "warn",
  "msg": "High abuse score detected",
  "ip": "192.168.1.100",
  "userId": "user-123",
  "abuseScore": 85,
  "events": {
    "login_failure": 5,
    "4xx_error": 20,
    "rate_limit_violation": 3
  }
}
```

### Security Scanning

**Dependency Scanning:**
```bash
# Manual security audit
npm audit --audit-level high

# CI/CD integration
audit-ci --config .audit-ci.json
```

**Secret Scanning:**
```bash
# Pre-commit hook
gitleaks protect --staged

# Full repository scan
gitleaks detect --config .gitleaks.toml
```

## Alerting & Escalation

### Alert Levels

**Critical (P1):**
- Application down/unreachable
- Database connection failure
- Security breach detected
- Backup failure

**High (P2):**
- High error rate (>5%)
- Slow response times (>2s p95)
- High abuse score activity
- Failed dependency security scan

**Medium (P3):**
- Elevated error rate (2-5%)
- Cache miss rate >50%
- Slow database queries
- Moderate security vulnerabilities

**Low (P4):**
- Performance degradation
- Non-critical feature failures
- Low severity security issues
- Capacity planning alerts

### Escalation Procedures

**Incident Response:**
1. **Detection:** Automated monitoring alerts
2. **Triage:** On-call engineer assessment
3. **Response:** Team notification and mitigation
4. **Resolution:** Fix deployment and verification
5. **Post-mortem:** Incident analysis and prevention

**Contact Tree:**
1. **On-call Engineer** (0-15 minutes)
2. **Team Lead** (15-30 minutes)
3. **Engineering Manager** (30-60 minutes)
4. **CTO** (1+ hours for P1 incidents)

## Performance Optimization

### Response Time Targets

**API Endpoints:**
- p50: < 200ms
- p95: < 500ms
- p99: < 1000ms

**Database Queries:**
- Average: < 50ms
- p95: < 200ms
- p99: < 500ms

**Cache Performance:**
- Hit rate: > 80%
- Response time: < 10ms

### Performance Budget

**Frontend Metrics:**
- LCP: < 2.5s (75th percentile)
- FID: < 100ms (75th percentile)
- CLS: < 0.1 (75th percentile)
- Total Blocking Time: < 300ms
- Speed Index: < 3.0s

**Resource Budgets:**
- JavaScript: < 500KB
- CSS: < 100KB
- Images: < 1MB
- Total payload: < 2MB

## Capacity Planning

### Resource Monitoring

**CPU Usage:**
- Target: < 70% average
- Alert: > 80% for 5 minutes
- Critical: > 90% for 1 minute

**Memory Usage:**
- Target: < 80% of available
- Alert: > 85% for 5 minutes
- Critical: > 95% for 1 minute

**Storage:**
- Database: Monitor growth rate
- Backups: Ensure retention compliance
- Logs: Implement rotation policies

### Scaling Indicators

**Scale Up Triggers:**
- Consistent high resource usage
- Response time degradation
- Queue length increases
- Error rate elevation

**Scale Down Triggers:**
- Low resource utilization (< 30%)
- Reduced traffic patterns
- Cost optimization opportunities

## Operational Runbooks

### Common Procedures

**Deploy New Version:**
1. Run pre-deployment checks
2. Create backup checkpoint
3. Deploy to staging environment
4. Execute smoke tests
5. Deploy to production
6. Monitor key metrics
7. Verify functionality

**Handle Performance Issue:**
1. Check current metrics
2. Identify bottleneck source
3. Review recent changes
4. Apply immediate mitigation
5. Implement permanent fix
6. Update monitoring/alerts

**Respond to Security Incident:**
1. Assess threat severity
2. Contain the incident
3. Gather forensic evidence
4. Notify stakeholders
5. Implement remediation
6. Conduct post-incident review

### Emergency Contacts

**Internal Team:**
- On-call Engineer: +1-555-ON-CALL
- Security Team: security@company.com
- Infrastructure: infra@company.com

**External Vendors:**
- Cloud Provider Support
- Security Incident Response Team
- Database Support
- CDN Provider Support

This operations manual should be reviewed monthly and updated with new procedures, metrics thresholds, and contact information as the system evolves.