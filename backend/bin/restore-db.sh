#!/bin/bash
# backend/bin/restore-db.sh
# MongoDB restore script with safety checks and verification

set -euo pipefail  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/../backups}"

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

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS] [BACKUP_FILE]

MongoDB Database Restore Script

OPTIONS:
    -h, --help              Show this help message
    -f, --force             Skip confirmation prompts (DANGEROUS)
    -d, --dry-run           Show what would be restored without doing it
    -t, --target-db NAME    Restore to different database name
    --drop                  Drop existing database before restore
    --latest                Use latest backup (ignore BACKUP_FILE)

ARGUMENTS:
    BACKUP_FILE             Path to backup file (.tar.gz)
                           If not provided, will use latest backup

EXAMPLES:
    $0                                    # Restore from latest backup
    $0 --latest                          # Same as above
    $0 backup_20240125_143022.tar.gz     # Restore specific backup
    $0 --dry-run --latest                # Preview latest restore
    $0 --target-db test_restore          # Restore to different database
    $0 --force --drop backup.tar.gz     # Force restore with drop

ENVIRONMENT:
    MONGO_URI              MongoDB connection string
    BACKUP_DIR             Directory containing backups (default: ../backups)

EOF
}

# Parse command line arguments
BACKUP_FILE=""
FORCE=false
DRY_RUN=false
TARGET_DB=""
DROP_DB=false
USE_LATEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -t|--target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        --drop)
            DROP_DB=true
            shift
            ;;
        --latest)
            USE_LATEST=true
            shift
            ;;
        -*)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            if [ -z "$BACKUP_FILE" ]; then
                BACKUP_FILE="$1"
            else
                error "Multiple backup files specified"
                exit 1
            fi
            shift
            ;;
    esac
done

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

# Determine target database
if [ -n "$TARGET_DB" ]; then
    RESTORE_DB="$TARGET_DB"
    log "Will restore to target database: $RESTORE_DB"
else
    RESTORE_DB="$DB_NAME"
    log "Will restore to original database: $RESTORE_DB"
fi

# Determine backup file to use
if [ "$USE_LATEST" = true ] || [ -z "$BACKUP_FILE" ]; then
    if [ -L "$BACKUP_DIR/latest.tar.gz" ]; then
        BACKUP_FILE="$BACKUP_DIR/latest.tar.gz"
        log "Using latest backup: $(readlink "$BACKUP_FILE")"
    else
        # Find most recent backup
        LATEST_BACKUP=$(find "$BACKUP_DIR" -name "teesfromthepast_backup_*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        if [ -n "$LATEST_BACKUP" ]; then
            BACKUP_FILE="$LATEST_BACKUP"
            log "Using most recent backup: $BACKUP_FILE"
        else
            error "No backup files found in $BACKUP_DIR"
            exit 1
        fi
    fi
else
    # Use specified backup file
    if [[ "$BACKUP_FILE" != /* ]]; then
        # Relative path - prepend backup directory
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Using backup file: $BACKUP_FILE"

# Extract backup to temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

log "Extracting backup to temporary directory..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

if [ $? -ne 0 ]; then
    error "Failed to extract backup file"
    exit 1
fi

# Find the backup directory
BACKUP_EXTRACT_DIR=$(find "$TEMP_DIR" -name "teesfromthepast_backup_*" -type d | head -1)
if [ -z "$BACKUP_EXTRACT_DIR" ]; then
    error "Could not find extracted backup directory"
    exit 1
fi

# Read manifest if available
MANIFEST_FILE="$BACKUP_EXTRACT_DIR/manifest.json"
if [ -f "$MANIFEST_FILE" ]; then
    log "Reading backup manifest..."
    
    BACKUP_DB=$(jq -r '.database' "$MANIFEST_FILE" 2>/dev/null || echo "unknown")
    BACKUP_TIMESTAMP=$(jq -r '.timestamp' "$MANIFEST_FILE" 2>/dev/null || echo "unknown")
    BACKUP_SIZE=$(jq -r '.backup_size' "$MANIFEST_FILE" 2>/dev/null || echo "unknown")
    
    log "Backup metadata:"
    log "  Database: $BACKUP_DB"
    log "  Timestamp: $BACKUP_TIMESTAMP"
    log "  Size: $BACKUP_SIZE"
    
    if [ "$BACKUP_DB" != "$DB_NAME" ] && [ "$BACKUP_DB" != "unknown" ] && [ -z "$TARGET_DB" ]; then
        warn "Backup database ($BACKUP_DB) differs from current database ($DB_NAME)"
        if [ "$FORCE" != true ]; then
            echo -n "Continue? [y/N]: "
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                log "Restore cancelled by user"
                exit 0
            fi
        fi
    fi
fi

# Find the actual database directory in the backup
DB_BACKUP_DIR="$BACKUP_EXTRACT_DIR/$BACKUP_DB"
if [ ! -d "$DB_BACKUP_DIR" ]; then
    # Try with the target database name
    DB_BACKUP_DIR="$BACKUP_EXTRACT_DIR/$RESTORE_DB"
    if [ ! -d "$DB_BACKUP_DIR" ]; then
        error "Database directory not found in backup"
        exit 1
    fi
fi

# Count collections in backup
COLLECTION_COUNT=$(find "$DB_BACKUP_DIR" -name "*.bson.gz" -o -name "*.bson" | wc -l)
log "Found $COLLECTION_COUNT collections in backup"

if [ "$COLLECTION_COUNT" -eq 0 ]; then
    error "No collections found in backup"
    exit 1
fi

# Safety confirmation unless forced
if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
    warn "This will restore data to database: $RESTORE_DB"
    if [ "$DROP_DB" = true ]; then
        warn "The existing database will be DROPPED first!"
    fi
    echo -n "Are you sure you want to continue? [y/N]: "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Restore cancelled by user"
        exit 0
    fi
fi

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    log "DRY RUN MODE - No changes will be made"
    log "Would restore:"
    log "  From: $BACKUP_FILE"
    log "  To database: $RESTORE_DB"
    log "  Collections: $COLLECTION_COUNT"
    if [ "$DROP_DB" = true ]; then
        log "  Would drop existing database first"
    fi
    log "Use --force to execute the restore"
    exit 0
fi

# Build mongorestore command
RESTORE_URI=$(echo "$MONGO_URI" | sed "s|/$DB_NAME|/$RESTORE_DB|")
MONGORESTORE_CMD="mongorestore --uri=\"$RESTORE_URI\""

if [ "$DROP_DB" = true ]; then
    MONGORESTORE_CMD="$MONGORESTORE_CMD --drop"
fi

MONGORESTORE_CMD="$MONGORESTORE_CMD --gzip --dir=\"$DB_BACKUP_DIR\""

# Execute the restore
log "Starting mongorestore..."
log "Command: $MONGORESTORE_CMD"

eval $MONGORESTORE_CMD

if [ $? -eq 0 ]; then
    success "Database restore completed successfully!"
    log "Restored to database: $RESTORE_DB"
    log "Collections restored: $COLLECTION_COUNT"
    
    # Output machine-readable summary
    echo "RESTORE_SUCCESS=true"
    echo "RESTORE_DATABASE=$RESTORE_DB"
    echo "COLLECTIONS_RESTORED=$COLLECTION_COUNT"
    echo "BACKUP_FILE=$BACKUP_FILE"
    
else
    error "Database restore failed"
    exit 1
fi