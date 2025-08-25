# Performance Budget Configuration

## Overview

This document outlines the performance budget and Core Web Vitals thresholds for the Tees From The Past application, providing clear targets for development and monitoring.

## Core Web Vitals Thresholds

### Largest Contentful Paint (LCP)
**Measures:** Loading performance
**Target:** 2.5 seconds or less

- **Good:** ≤ 2.5s
- **Needs Improvement:** 2.5s - 4.0s  
- **Poor:** > 4.0s

**Optimization Strategies:**
- Optimize server response times
- Implement efficient caching
- Compress and optimize images
- Preload critical resources
- Use CDN for static assets

### First Input Delay (FID)
**Measures:** Interactivity
**Target:** 100 milliseconds or less

- **Good:** ≤ 100ms
- **Needs Improvement:** 100ms - 300ms
- **Poor:** > 300ms

**Optimization Strategies:**
- Minimize JavaScript execution time
- Break up long-running tasks
- Use web workers for heavy computations
- Optimize third-party scripts
- Implement code splitting

### Cumulative Layout Shift (CLS)
**Measures:** Visual stability
**Target:** 0.1 or less

- **Good:** ≤ 0.1
- **Needs Improvement:** 0.1 - 0.25
- **Poor:** > 0.25

**Optimization Strategies:**
- Set explicit dimensions for images/videos
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use transform animations instead of layout-triggering properties

### Interaction to Next Paint (INP)
**Measures:** Responsiveness
**Target:** 200 milliseconds or less

- **Good:** ≤ 200ms
- **Needs Improvement:** 200ms - 500ms
- **Poor:** > 500ms

**Optimization Strategies:**
- Optimize event handlers
- Reduce main thread blocking
- Use efficient DOM manipulation
- Implement virtual scrolling for large lists

## Resource Budgets

### JavaScript Budget
**Target:** 500KB or less (compressed)

**Breakdown:**
- Framework (React): ~150KB
- Application code: ~200KB
- Third-party libraries: ~100KB
- Vendor/polyfills: ~50KB

**Monitoring:**
- Bundle analyzer reports
- Performance budget CI checks
- Runtime performance monitoring

### CSS Budget
**Target:** 100KB or less (compressed)

**Breakdown:**
- Framework styles: ~30KB
- Component styles: ~50KB
- Utility classes: ~20KB

**Optimization:**
- Remove unused CSS
- Use CSS minification
- Implement critical CSS inlining

### Image Budget
**Target:** 1MB total page weight

**Guidelines:**
- Use WebP format when supported
- Implement responsive images
- Lazy load below-the-fold images
- Optimize image compression (80-85% quality)

### Total Page Weight
**Target:** 2MB or less

**Components:**
- HTML: ~10KB
- CSS: ~100KB
- JavaScript: ~500KB
- Images: ~1MB
- Fonts: ~200KB
- Other assets: ~190KB

## Lighthouse CI Configuration

### Performance Thresholds

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["warn", {"minScore": 0.8}],
        "categories:seo": ["warn", {"minScore": 0.8}]
      }
    },
    "budgets": [
      {
        "path": "/*",
        "timings": [
          {
            "metric": "largest-contentful-paint",
            "budget": 2500
          },
          {
            "metric": "cumulative-layout-shift",
            "budget": 0.1
          },
          {
            "metric": "total-blocking-time",
            "budget": 300
          }
        ]
      }
    ]
  }
}
```

### Performance Score Targets

- **Performance:** ≥ 80 (Warning below 80)
- **Accessibility:** ≥ 90 (Error below 90)
- **Best Practices:** ≥ 80 (Warning below 80)
- **SEO:** ≥ 80 (Warning below 80)

## Monitoring & Alerting

### Real User Monitoring (RUM)

**Data Collection:**
- Automatic Core Web Vitals measurement
- Custom performance marks
- User interaction timing
- Network condition awareness

**Alerting Thresholds:**
- P75 LCP > 3.0s for 24 hours
- P75 FID > 150ms for 24 hours  
- P75 CLS > 0.15 for 24 hours
- Performance score drop > 10 points

### Synthetic Monitoring

**Lighthouse CI:**
- Runs on every PR
- Blocks deployment if budgets exceeded
- Provides performance regression detection
- Generates trend reports

**Third-party Tools:**
- WebPageTest integration
- SpeedCurve monitoring
- GTmetrix automated testing

## Development Guidelines

### Performance-First Development

**Code Reviews:**
- Performance impact assessment
- Bundle size impact review
- Core Web Vitals consideration
- Accessibility validation

**Testing Requirements:**
- Performance regression tests
- Cross-device testing
- Network throttling validation
- Accessibility compliance

### Optimization Checklist

**Before Deployment:**
- [ ] Lighthouse score ≥ 80
- [ ] Bundle size within budget
- [ ] Images optimized and compressed
- [ ] Critical CSS inlined
- [ ] JavaScript code split appropriately
- [ ] Third-party scripts audited
- [ ] Performance regression test passed

**Monthly Review:**
- [ ] RUM data analysis
- [ ] Performance trend evaluation
- [ ] Budget adjustment if needed
- [ ] Optimization opportunity identification

## Performance Culture

### Team Responsibilities

**Frontend Developers:**
- Implement performance best practices
- Monitor bundle sizes during development
- Use performance profiling tools
- Optimize images and assets

**Backend Developers:**
- Optimize API response times
- Implement efficient caching strategies
- Monitor database query performance
- Ensure fast server response times

**QA Engineers:**
- Include performance testing in test plans
- Validate across different devices/networks
- Report performance regressions
- Verify Core Web Vitals compliance

**DevOps Engineers:**
- Maintain monitoring infrastructure
- Optimize CI/CD pipeline performance
- Implement caching strategies
- Monitor server performance metrics

### Performance Budget Enforcement

**Automated Checks:**
- CI/CD pipeline integration
- Pull request status checks
- Deployment blocking on budget violations
- Regular performance audits

**Manual Reviews:**
- Weekly performance review meetings
- Monthly performance metrics analysis
- Quarterly budget reassessment
- Annual performance strategy review

This performance budget should be reviewed and updated quarterly to ensure alignment with user expectations and business requirements.