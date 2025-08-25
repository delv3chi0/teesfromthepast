# Email Domain Setup Guide

This document provides guidance for setting up SPF, DKIM, and DMARC records for email deliverability with Tees From The Past.

## Overview

Proper email authentication helps ensure your emails reach recipients' inboxes and protects your domain from spoofing. This guide covers the essential DNS records needed for email authentication.

## SPF (Sender Policy Framework)

SPF records specify which mail servers are authorized to send emails from your domain.

### Basic SPF Record
Add this TXT record to your domain's DNS:

```
yourdomain.com. IN TXT "v=spf1 include:_spf.resend.com ~all"
```

### With Additional Mail Providers
If you use multiple email services:

```
yourdomain.com. IN TXT "v=spf1 include:_spf.resend.com include:_spf.google.com ~all"
```

## DKIM (DomainKeys Identified Mail)

DKIM adds a digital signature to your emails. The exact setup depends on your email provider.

### Resend DKIM Setup
1. Contact Resend support or check their documentation for DKIM setup
2. They will provide CNAME records to add to your DNS
3. Typical format:
```
resend._domainkey.yourdomain.com. IN CNAME resend.dkim.resend.com.
```

## DMARC (Domain-based Message Authentication)

DMARC builds on SPF and DKIM to provide additional protection and reporting.

### Basic DMARC Record
Start with a monitoring-only policy:

```
_dmarc.yourdomain.com. IN TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; ruf=mailto:dmarc-failures@yourdomain.com; fo=1"
```

### Progressive DMARC Policies
1. **Monitoring** (`p=none`): Collect reports without affecting delivery
2. **Quarantine** (`p=quarantine`): Send suspicious emails to spam folder
3. **Reject** (`p=reject`): Reject suspicious emails entirely

## Email Provider-Specific Setup

### Resend
- SPF: `include:_spf.resend.com`
- DKIM: Contact Resend for specific CNAME records
- Documentation: https://resend.com/docs

### Gmail/G Suite
- SPF: `include:_spf.google.com`
- DKIM: Available in Google Admin Console
- Documentation: https://support.google.com/a/answer/174124

## Verification Steps

1. **SPF Check**: Use tools like MXToolbox SPF checker
2. **DKIM Check**: Send test emails and verify DKIM signatures
3. **DMARC Check**: Monitor DMARC reports for authentication results

## Common Issues

### SPF Record Limits
- Maximum 10 DNS lookups per SPF record
- Combine includes when possible
- Use IP addresses for high-volume senders

### DKIM Signature Failures
- Ensure CNAME records are correctly configured
- Check for DNS propagation delays
- Verify email content isn't being modified in transit

### DMARC Alignment
- SPF and DKIM domains must align with the From domain
- Use relaxed alignment if using subdomains

## Testing Tools

- **MXToolbox**: https://mxtoolbox.com/ (SPF, DKIM, DMARC checks)
- **DMARC Analyzer**: https://www.dmarcanalyzer.com/
- **Mail Tester**: https://www.mail-tester.com/

## Monitoring

### DMARC Reports
- **RUA Reports**: Aggregate reports (daily/weekly)
- **RUF Reports**: Forensic reports (individual failures)
- Consider using a DMARC report analyzer service

### Email Deliverability
- Monitor bounce rates and spam complaints
- Check sender reputation with major ISPs
- Set up feedback loops with major email providers

## Production Checklist

- [ ] SPF record configured and verified
- [ ] DKIM setup completed with email provider
- [ ] DMARC policy implemented (start with `p=none`)
- [ ] DNS propagation verified (24-48 hours)
- [ ] Test emails sent and authentication verified
- [ ] DMARC reports monitoring configured
- [ ] Backup MX records configured (if needed)

## Security Considerations

- Use strict DMARC policies (`p=reject`) once confidence is high
- Monitor DMARC reports for spoofing attempts
- Regularly review and update SPF records
- Implement subdomain policies if using multiple subdomains

## Next Steps

This is a placeholder document. Once email functionality is fully implemented:

1. Update with specific provider configurations
2. Add screenshots for DNS setup
3. Include troubleshooting guides
4. Add monitoring and alerting recommendations

For immediate implementation, start with SPF records and basic DMARC monitoring, then progressively enhance security policies based on report analysis.