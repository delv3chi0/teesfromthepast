# Database Backup & Restore Procedures

## Overview

This document outlines the automated backup system and manual restore procedures for the Tees From The Past application database.

## Backup System

### Automated Daily Backups

- **Schedule**: Daily at 2:00 AM UTC via GitHub Actions
- **Retention**: 30 days (configurable)
- **Encryption**: AES256 encryption with passphrase
- **Storage**: GitHub Actions artifacts
- **Notification**: Failure alerts via GitHub

### Backup Contents

Each backup includes:
- Complete MongoDB database dump (gzipped)
- Backup manifest with metadata
- Verification checksums
- Restore instructions

### Backup File Structure

```
teesfromthepast_backup_20240125_143022.tar.gz
├── teesfromthepast_backup_20240125_143022/
│   ├── manifest.json                 # Backup metadata
│   └── teesfromthepast/             # Database dump
│       ├── users.bson.gz
│       ├── users.metadata.json.gz
│       ├── orders.bson.gz
│       ├── orders.metadata.json.gz
│       └── ...
```

## Manual Backup

### Prerequisites

- MongoDB tools (`mongodump`, `mongorestore`)
- Access to production database
- Sufficient disk space (at least 1GB free)

### Create Backup

```bash
# From backend directory
./bin/backup-db.sh
```

**Options:**
- Environment variables in `.env` file
- `BACKUP_DIR` to specify custom backup location
- `MONGO_URI` for database connection

### Backup Script Features

- ✅ Automatic compression (gzip + tar)
- ✅ Metadata manifest generation
- ✅ Disk space verification
- ✅ Old backup cleanup (7+ days)
- ✅ Atomic operations (cleanup on failure)
- ✅ Machine-readable output for CI

## Restore Procedures

### Quick Restore (Latest Backup)

```bash
# Restore from latest backup
./bin/restore-db.sh --latest

# Dry run to preview
./bin/restore-db.sh --dry-run --latest
```

### Restore Specific Backup

```bash
# Restore specific backup file
./bin/restore-db.sh backup_20240125_143022.tar.gz

# Restore to different database
./bin/restore-db.sh --target-db staging_restore backup_20240125_143022.tar.gz

# Force restore with database drop
./bin/restore-db.sh --force --drop backup_20240125_143022.tar.gz
```

### Restore Script Options

| Option | Description |
|--------|-------------|
| `--latest` | Use most recent backup |
| `--dry-run` | Preview without making changes |
| `--force` | Skip confirmation prompts |
| `--drop` | Drop existing database before restore |
| `--target-db NAME` | Restore to different database |
| `--help` | Show usage information |

### Safety Features

- ✅ Interactive confirmation prompts
- ✅ Backup verification before restore
- ✅ Database mismatch warnings
- ✅ Dry-run mode for testing
- ✅ Automatic manifest parsing
- ✅ Collection count verification

## Recovery Point Objective (RPO) & Recovery Time Objective (RTO)

### Current Targets

- **RPO**: 24 hours (daily backups)
- **RTO**: 2 hours (including restoration and verification)

### SLA Commitments

- **Data Loss**: Maximum 24 hours of data loss
- **Downtime**: Maximum 2 hours for full restoration
- **Availability**: 99.9% uptime target

## Emergency Restore Procedures

### 1. Assess the Situation

```bash
# Check database connectivity
mongo "$MONGO_URI" --eval "db.runCommand('ping')"

# Check available backups
ls -la backups/

# Review latest backup manifest
tar -xzf backups/latest.tar.gz -O */manifest.json | jq '.'
```

### 2. Prepare for Restore

```bash
# Create safety backup if database is accessible
./bin/backup-db.sh

# Download backup from GitHub Actions if needed
# (Manual download from GitHub UI or API)
```

### 3. Execute Restoration

```bash
# Test restore first (if time permits)
./bin/restore-db.sh --dry-run --latest

# Execute full restore
./bin/restore-db.sh --force --drop --latest
```

### 4. Verification Steps

```bash
# Verify database connection
mongo "$MONGO_URI" --eval "db.stats()"

# Check collection counts
mongo "$MONGO_URI" --eval "
  db.runCommand('listCollections').cursor.firstBatch.forEach(
    c => print(c.name + ': ' + db[c.name].count())
  )
"

# Test application functionality
curl -f http://localhost:5000/health
```

## Backup Monitoring

### GitHub Actions Monitoring

- Monitor workflow status in GitHub Actions tab
- Check artifact uploads and retention
- Review backup logs for errors or warnings

### Key Metrics to Monitor

- Backup file size trends
- Backup completion time
- Storage usage and retention
- Restore test results (monthly)

### Alerting

- GitHub Actions failure notifications
- Disk space warnings (< 1GB free)
- Backup size anomalies (>50% change)

## Testing & Validation

### Monthly Restore Drill

```bash
# 1. Create test environment
export TEST_MONGO_URI="mongodb://localhost:27017/restore_test"

# 2. Restore latest backup to test database
./bin/restore-db.sh --target-db restore_test --latest

# 3. Validate data integrity
# - Check collection counts
# - Verify recent data
# - Test application functionality

# 4. Cleanup test database
mongo "$TEST_MONGO_URI" --eval "db.dropDatabase()"
```

### Automated Testing

The GitHub Actions workflow includes:
- Backup creation verification
- Encryption/decryption testing
- Dry-run restore validation
- Manifest parsing verification

## Troubleshooting

### Common Issues

#### Backup Fails with "Insufficient Disk Space"

```bash
# Check available space
df -h /path/to/backups

# Clean old backups manually
find /path/to/backups -name "*.tar.gz" -mtime +7 -delete

# Set custom backup location
export BACKUP_DIR=/larger/storage/path
./bin/backup-db.sh
```

#### Restore Fails with "Database Not Found"

```bash
# Check backup contents
tar -tzf backup_file.tar.gz | head -20

# Verify manifest
tar -xzf backup_file.tar.gz -O */manifest.json | jq '.database'

# Try different database name
./bin/restore-db.sh --target-db correct_db_name backup_file.tar.gz
```

#### Encrypted Backup Cannot Be Decrypted

```bash
# Verify passphrase
echo "$BACKUP_PASSPHRASE" | gpg --batch --decrypt --passphrase-fd 0 backup.tar.gz.enc

# Check encryption method
file backup.tar.gz.enc
```

### Log Analysis

```bash
# Check backup logs
tail -f /var/log/backup.log

# Analyze backup patterns
grep "BACKUP_SUCCESS" /var/log/backup.log | tail -10

# Monitor disk usage during backup
watch -n 1 'df -h /backup/location'
```

## Security Considerations

- Backup files contain sensitive data and must be encrypted
- Passphrases should be stored securely (GitHub Secrets)
- Access to backups should be restricted (admin only)
- Regular rotation of encryption passphrases
- Audit trails for backup access and usage

## Compliance Notes

- Backups include all user data and PII
- Retention policy complies with data protection regulations
- Encryption meets industry standard requirements (AES256)
- Access controls documented and monitored