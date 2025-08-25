#!/bin/bash
# backend/bin/backup-db.sh
# MongoDB backup script with compression and metadata

set -euo pipefail  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/../backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="teesfromthepast_backup_$DATE"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    log "Loaded environment variables from .env"
fi

# Check if MONGO_URI is set
if [ -z "${MONGO_URI:-}" ]; then
    error "MONGO_URI environment variable not set"
    exit 1
fi

# Parse MongoDB URI to extract database name
DB_NAME=$(echo "$MONGO_URI" | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
    error "Could not extract database name from MONGO_URI"
    exit 1
fi

log "Starting backup for database: $DB_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"
if [ $? -ne 0 ]; then
    error "Failed to create backup directory: $BACKUP_DIR"
    exit 1
fi

# Check available disk space (at least 1GB free)
AVAILABLE_SPACE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
MIN_SPACE=1048576  # 1GB in KB

if [ "$AVAILABLE_SPACE" -lt "$MIN_SPACE" ]; then
    error "Insufficient disk space. Available: ${AVAILABLE_SPACE}KB, Required: ${MIN_SPACE}KB"
    exit 1
fi

log "Disk space check passed. Available: ${AVAILABLE_SPACE}KB"

# Perform the backup
log "Starting mongodump..."
mongodump --uri="$MONGO_URI" --out="$BACKUP_PATH" --gzip

if [ $? -ne 0 ]; then
    error "mongodump failed"
    rm -rf "$BACKUP_PATH"
    exit 1
fi

# Create backup manifest with metadata
MANIFEST_FILE="$BACKUP_PATH/manifest.json"
cat > "$MANIFEST_FILE" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "database": "$DB_NAME",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mongo_uri": "$(echo "$MONGO_URI" | sed 's/\/\/[^@]*@/\/\/***:***@/')",
  "backup_path": "$BACKUP_PATH",
  "created_by": "$(whoami)",
  "hostname": "$(hostname)",
  "script_version": "1.0.0",
  "backup_type": "full",
  "compression": "gzip"
}
EOF

# Get backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
log "Backup size: $BACKUP_SIZE"

# Update manifest with size information
jq --arg size "$BACKUP_SIZE" '.backup_size = $size' "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"

# Create compressed archive
log "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

if [ $? -eq 0 ]; then
    # Remove uncompressed backup directory
    rm -rf "$BACKUP_PATH"
    
    ARCHIVE_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
    success "Backup completed successfully!"
    log "Archive: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    log "Archive size: $ARCHIVE_SIZE"
    
    # Create symlink to latest backup
    ln -sf "${BACKUP_NAME}.tar.gz" "$BACKUP_DIR/latest.tar.gz"
    log "Created symlink: $BACKUP_DIR/latest.tar.gz"
    
else
    error "Failed to create compressed archive"
    exit 1
fi

# Cleanup old backups (keep last 7 days)
log "Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "teesfromthepast_backup_*.tar.gz" -mtime +7 -type f -delete
CLEANED=$(find "$BACKUP_DIR" -name "teesfromthepast_backup_*.tar.gz" | wc -l)
log "Retained $CLEANED backup files"

# Final verification
if [ -f "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" ]; then
    success "Backup verification passed"
    log "Backup available at: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    
    # Output machine-readable summary for CI/monitoring
    echo "BACKUP_SUCCESS=true"
    echo "BACKUP_FILE=$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "BACKUP_SIZE=$ARCHIVE_SIZE"
    echo "DATABASE=$DB_NAME"
    echo "TIMESTAMP=$DATE"
    
    exit 0
else
    error "Backup verification failed - file not found"
    exit 1
fi