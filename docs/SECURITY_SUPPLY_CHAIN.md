# Supply Chain & Security Documentation

## Overview

This document outlines the supply chain security measures and policies implemented for the Tees From The Past application to protect against vulnerabilities, malicious dependencies, and security threats.

## Dependency Management

### Automated Dependency Review

**GitHub Actions Integration:**
- `dependency-review.yml` - Reviews all PRs for dependency changes
- Blocks high/critical severity vulnerabilities
- Checks license compatibility
- Comments on PRs with security findings

**Configuration:**
- Fails on: `critical`, `high` severity vulnerabilities
- Blocked licenses: `GPL-2.0`, `GPL-3.0`, `AGPL-3.0`
- Allowed licenses: `MIT`, `Apache-2.0`, `BSD-*`, `ISC`

### NPM Audit Integration

**audit-ci Configuration:**
```json
{
  "high": true,        // Fail on high severity
  "critical": true,    // Fail on critical severity
  "moderate": false,   // Allow moderate (with review)
  "low": false,        // Allow low severity
  "allowlist": []      // Specific advisories to bypass
}
```

**Daily Security Scans:**
- Automated npm audit on main branch
- Pulls latest vulnerability database
- Reports sent to security team
- Action items tracked in GitHub Issues

### Dependency Policies

1. **New Dependencies:**
   - Must pass security review
   - Require maintainer approval
   - Check for known vulnerabilities
   - Verify license compatibility

2. **Updates:**
   - Automated PR creation for security updates
   - Weekly dependency update reviews
   - Breaking change impact assessment
   - Rollback procedures documented

3. **Removal:**
   - Remove unused dependencies quarterly
   - Archive dependencies no longer maintained
   - Replace deprecated packages proactively

## Secret Scanning

### Gitleaks Configuration

**Pre-commit Hooks:**
- Install: `git config core.hooksPath .githooks`
- Runs gitleaks on every commit
- Blocks commits containing secrets
- Provides remediation guidance

**CI/CD Integration:**
- Full repository scan on every push
- Historical commit scanning
- Custom rules for application-specific secrets

**Protected Secrets:**
- Stripe API keys (`sk_`, `whsec_`)
- MongoDB connection strings
- JWT secrets
- Cloudinary API credentials
- Third-party API keys

### Secret Management

**Environment Variables:**
- Use GitHub Secrets for CI/CD
- Local development uses `.env` files (gitignored)
- Production secrets stored in secure vault
- Regular rotation schedule (90 days)

**Access Control:**
- Principle of least privilege
- Role-based secret access
- Audit trails for secret usage
- Two-person authorization for critical secrets

## Software Bill of Materials (SBOM)

### Automated Generation

**CycloneDX Format:**
- Industry-standard SBOM format
- Complete dependency tree
- License information included
- Vulnerability mapping

**Generation Process:**
1. Extract dependencies from `package.json`
2. Include transitive dependencies
3. Add metadata (versions, licenses, sources)
4. Generate signed SBOM artifacts

**Distribution:**
- Attached to GitHub releases
- Stored as CI artifacts (90-day retention)
- Available via API endpoint
- Shared with customers on request

### SBOM Contents

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "metadata": {
    "component": {
      "name": "teesfromthepast",
      "version": "1.0.0",
      "type": "application"
    }
  },
  "components": [
    // All dependencies with metadata
  ]
}
```

## Vulnerability Management

### Scanning Schedule

- **Continuous:** Pre-commit secret scanning
- **Daily:** Dependency vulnerability scan
- **Weekly:** Container image scanning
- **Monthly:** Third-party security review
- **Quarterly:** Penetration testing

### Response Procedures

**Critical Vulnerabilities (CVSS 9.0+):**
1. Immediate notification to security team
2. Emergency patch within 24 hours
3. Hotfix deployment process
4. Post-incident review

**High Severity (CVSS 7.0-8.9):**
1. Patch within 7 days
2. Security advisory creation
3. Customer notification if applicable
4. Update security documentation

**Medium/Low Severity:**
1. Patch in next scheduled release
2. Track in security backlog
3. Evaluate workarounds
4. Monitor for exploitation

### Remediation Strategies

1. **Update Dependencies:**
   - Patch to latest secure version
   - Test for breaking changes
   - Automated security PRs

2. **Alternative Packages:**
   - Replace vulnerable dependencies
   - Evaluate functionality equivalence
   - Migration planning

3. **Workarounds:**
   - Application-level mitigations
   - Environment-based protections
   - Monitoring for exploitation

## Security Tooling

### Integrated Tools

**Static Analysis:**
- ESLint security rules
- Semgrep for custom rules
- CodeQL for vulnerability detection

**Dynamic Analysis:**
- OWASP ZAP for web scanning
- Burp Suite for manual testing
- API security testing

**Infrastructure:**
- Snyk for dependency scanning
- Docker image scanning
- Terraform security scanning

### CI/CD Security Gates

**Required Checks:**
- [ ] Dependency vulnerability scan
- [ ] Secret detection
- [ ] License compatibility
- [ ] SBOM generation
- [ ] Security unit tests

**Deployment Gates:**
- Security sign-off for production
- Vulnerability assessment complete
- SBOM available
- Incident response plan updated

## Compliance & Reporting

### Security Metrics

**Key Performance Indicators:**
- Mean Time to Patch (MTTP)
- Vulnerability count by severity
- Dependency age and staleness
- Secret detection effectiveness

**Reporting Schedule:**
- **Weekly:** Vulnerability dashboard update
- **Monthly:** Security metrics report
- **Quarterly:** Executive security briefing
- **Annually:** Security audit and review

### Audit Requirements

**Documentation:**
- Security policy maintenance
- Incident response procedures
- Vendor security assessments
- Compliance certification tracking

**Evidence Collection:**
- Vulnerability scan reports
- Patch management records
- Access control reviews
- Security training completion

## Incident Response

### Security Incident Classification

**Severity Levels:**
1. **Critical:** Active exploitation detected
2. **High:** Vulnerability with known exploit
3. **Medium:** Vulnerability requiring attention
4. **Low:** Security improvement opportunity

### Response Team

**Roles & Responsibilities:**
- **Security Lead:** Incident coordination
- **Development Lead:** Technical remediation
- **DevOps Lead:** Infrastructure response
- **Product Owner:** Business impact assessment

### Communication Plan

**Internal Notification:**
- Immediate: Security team via Slack
- 1 hour: Management notification
- 4 hours: Stakeholder briefing
- 24 hours: Detailed impact assessment

**External Communication:**
- Customer notification (if applicable)
- Security advisory publication
- Vendor coordination
- Regulatory reporting (if required)

## Training & Awareness

### Security Training Program

**Mandatory Training:**
- Secure coding practices
- Dependency management
- Secret handling procedures
- Incident response protocols

**Role-Specific Training:**
- **Developers:** OWASP Top 10, secure SDLC
- **DevOps:** Infrastructure security, monitoring
- **QA:** Security testing, vulnerability assessment

### Security Culture

**Best Practices:**
- Security-first mindset
- Continuous learning approach
- Proactive threat modeling
- Regular security discussions

**Recognition Program:**
- Security champion program
- Bug bounty participation
- Security contribution rewards
- Conference attendance support

## Escalation Procedures

### Contact Information

**Internal Escalation:**
1. Security Team: security@company.com
2. CISO: ciso@company.com
3. CTO: cto@company.com
4. CEO: ceo@company.com

**External Resources:**
- CERT/CC: cert@cert.org
- GitHub Security: security@github.com
- Cloud Provider Security Teams
- Third-party security consultants

### Emergency Procedures

**After Hours Response:**
- 24/7 security hotline
- Emergency contact tree
- Incident commander on-call
- Communication protocols

This document is reviewed quarterly and updated as needed to reflect current security practices and regulatory requirements.