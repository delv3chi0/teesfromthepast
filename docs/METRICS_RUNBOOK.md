# Metrics Runbook

This document provides operational guidance for monitoring and alerting based on the TeesFromThePast backend metrics.

## Overview

The backend exposes Prometheus-compatible metrics at `/metrics` when enabled. Metrics collection includes:

- HTTP request metrics (counters, duration histograms)
- Rate limiting metrics (rate_limited_total, algorithm distribution)
- Redis error tracking (redis_errors_total)
- System metrics (memory, CPU, file descriptors)

## Metrics Catalog

### HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|---------|-------------|
| `http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request duration in seconds |

### Rate Limiting Metrics

| Metric | Type | Labels | Description |
|--------|------|---------|-------------|
| `rate_limited_total` | Counter | algorithm, route | Total rate-limited requests |

### Redis Metrics

| Metric | Type | Labels | Description |
|--------|------|---------|-------------|
| `redis_errors_total` | Counter | operation | Total Redis operation errors |

### System Metrics (Default)

- `process_cpu_user_seconds_total`
- `process_cpu_system_seconds_total`
- `process_resident_memory_bytes`
- `process_heap_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_active_handles_total`

## Alert Configuration

### Critical Alerts

#### Service Availability
```yaml
- alert: ServiceDown
  expr: up == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Backend service is down"
    description: "Service has been unreachable for 1+ minutes"
```

#### High Error Rate
```yaml
- alert: HighErrorRate
  expr: |
    (
      rate(http_requests_total{status_code=~"5.."}[5m]) /
      rate(http_requests_total[5m])
    ) > 0.05
  for: 3m
  labels:
    severity: critical
  annotations:
    summary: "High server error rate"
    description: "5xx error rate: {{ $value | humanizePercentage }} for 3+ minutes"
```

#### Redis Connection Issues
```yaml
- alert: RedisConnectionErrors
  expr: rate(redis_errors_total[5m]) > 1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Redis connection errors detected"
    description: "Redis error rate: {{ $value }} errors/second for 2+ minutes"
```

### Warning Alerts

#### High Latency
```yaml
- alert: HighP95Latency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2.0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High P95 response latency"
    description: "P95 latency is {{ $value }}s for 5+ minutes"
```

#### Rate Limiting Spike
```yaml
- alert: RateLimitingSpike
  expr: rate(rate_limited_total[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Sustained rate limiting activity"
    description: "Rate limiting {{ $value }} requests/second for 5+ minutes"
```

#### Memory Usage
```yaml
- alert: HighMemoryUsage
  expr: process_resident_memory_bytes / 1024 / 1024 / 1024 > 1.0
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage"
    description: "Memory usage: {{ $value }}GB for 10+ minutes"
```

## Dashboard Queries

### Golden Signals

**Request Rate**
```promql
# Overall request rate
rate(http_requests_total[5m])

# Request rate by route
sum(rate(http_requests_total[5m])) by (route)
```

**Error Rate**
```promql
# Overall error percentage
rate(http_requests_total{status_code=~"5.."}[5m]) / 
rate(http_requests_total[5m]) * 100

# Error rate by route
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (route) / 
sum(rate(http_requests_total[5m])) by (route) * 100
```

**Latency**
```promql
# P50, P95, P99 latencies
histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Latency by route
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (route, le)
)
```

**Saturation**
```promql
# Rate limiting activity
rate(rate_limited_total[5m])

# Rate limiting by algorithm
sum(rate(rate_limited_total[5m])) by (algorithm)

# Event loop lag (Node.js saturation)
nodejs_eventloop_lag_seconds
```

### Operational Metrics

**Rate Limiting Analysis**
```promql
# Rate limiting distribution by algorithm
sum(rate(rate_limited_total[1h])) by (algorithm)

# Most rate-limited routes
topk(10, sum(rate(rate_limited_total[1h])) by (route))

# Rate limiting trends
rate(rate_limited_total[5m])
```

**Redis Health**
```promql
# Redis error rate
rate(redis_errors_total[5m])

# Redis errors by operation type
sum(rate(redis_errors_total[5m])) by (operation)
```

## Troubleshooting Guide

### High Error Rate

1. **Check error distribution:**
   ```promql
   sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (status_code, route)
   ```

2. **Identify affected routes:**
   ```promql
   topk(5, sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (route))
   ```

3. **Check recent deployments:** Compare with deployment timeline
4. **Verify dependencies:** Check Redis, MongoDB connections
5. **Review logs:** Look for error patterns and stack traces

### High Latency

1. **Identify slow routes:**
   ```promql
   topk(5, histogram_quantile(0.95, 
     sum(rate(http_request_duration_seconds_bucket[5m])) by (route, le)
   ))
   ```

2. **Check database queries:** Look for slow query warnings in logs
3. **Verify Redis performance:** Check Redis latency and connection pool
4. **Monitor system resources:** CPU, memory, I/O utilization

### Rate Limiting Issues

1. **Analyze rate limiting patterns:**
   ```promql
   sum(rate(rate_limited_total[5m])) by (algorithm, route)
   ```

2. **Check for abuse patterns:** Review IP addresses and user agents in logs
3. **Verify rate limit configuration:** Ensure limits are appropriate for traffic patterns
4. **Consider algorithm tuning:** Evaluate if different algorithms are needed

### Redis Connection Issues

1. **Check Redis metrics:**
   ```promql
   rate(redis_errors_total[5m])
   ```

2. **Verify Redis health:** Check Redis server status and logs
3. **Review connection pools:** Monitor connection counts and timeouts
4. **Check network connectivity:** Verify network path to Redis

## Capacity Planning

### Baseline Metrics

Monitor these metrics for capacity planning:

- **Request rate:** Track growth trends and peak traffic patterns
- **Response times:** Monitor P95/P99 latency trends
- **Resource utilization:** CPU, memory, Redis connection usage
- **Rate limiting:** Track when limits are reached regularly

### Scaling Indicators

Scale when:
- P95 latency consistently > 1s
- CPU utilization > 70% for sustained periods
- Memory usage approaching container limits
- Rate limiting becoming too aggressive
- Redis connection pool exhaustion

## Runbook Actions

### Service Restoration

1. **Check deployment status:** Verify if related to recent changes
2. **Review infrastructure:** Check container/instance health
3. **Verify dependencies:** Ensure Redis, MongoDB are accessible
4. **Scale if needed:** Add instances if resource-constrained
5. **Rollback if necessary:** Revert to last known good version

### Performance Optimization

1. **Profile slow endpoints:** Use APM tools for detailed tracing
2. **Optimize database queries:** Add indexes, optimize N+1 queries
3. **Tune caching:** Increase cache hit rates, optimize TTLs
4. **Adjust rate limits:** Fine-tune algorithms and thresholds

### Maintenance Tasks

**Daily:**
- Review error rates and high-latency alerts
- Check rate limiting trends and abuse patterns

**Weekly:**
- Analyze traffic growth and capacity trends
- Review alert thresholds and tune if needed
- Update rate limit configurations based on usage patterns

**Monthly:**
- Capacity planning review based on metrics trends
- Performance optimization opportunities
- Alert and dashboard improvements

## Configuration Management

### Metrics Collection

- **Enable/Disable:** Set `ENABLE_METRICS=true/false`
- **Production:** Explicitly enable with `ENABLE_METRICS=true`
- **Development:** Enabled by default unless `ENABLE_METRICS=false`

### Rate Limiting Metrics

Rate limiting metrics are automatically collected when rate limiting is active. Ensure Redis is available for accurate metrics collection.

### Alert Configuration

Store alert rules in version control and apply via CI/CD. Test alert rules in staging before production deployment.

## Security Considerations

- **Metrics endpoint access:** Consider restricting `/metrics` endpoint access
- **Sensitive data:** Ensure no sensitive information is exposed in metric labels
- **Resource usage:** Monitor metrics collection overhead
- **Retention:** Configure appropriate metric retention periods