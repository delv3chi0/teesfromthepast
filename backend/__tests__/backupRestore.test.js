// backend/__tests__/backupRestore.test.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

describe('Backup and Restore Scripts', () => {
  const testBackupDir = '/tmp/test-backups';
  const scriptDir = path.join(__dirname, '../bin');

  beforeAll(() => {
    // Create test backup directory
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
  });

  describe('Backup Script', () => {
    it('should show error for missing MONGO_URI', async () => {
      const env = { ...process.env };
      delete env.MONGO_URI;

      try {
        await execAsync(`${scriptDir}/backup-db.sh`, {
          env,
          cwd: path.join(__dirname, '..')
        });
        fail('Expected script to fail');
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('MONGO_URI environment variable not set');
      }
    });

    it('should validate script exists and is executable', () => {
      const scriptPath = path.join(scriptDir, 'backup-db.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const stats = fs.statSync(scriptPath);
      expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Check execute permissions
    });

    it('should handle invalid MongoDB URI gracefully', async () => {
      const env = {
        ...process.env,
        MONGO_URI: 'invalid-uri',
        BACKUP_DIR: testBackupDir
      };

      try {
        await execAsync(`${scriptDir}/backup-db.sh`, {
          env,
          cwd: path.join(__dirname, '..')
        });
        fail('Expected script to fail');
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('Could not extract database name');
      }
    });
  });

  describe('Restore Script', () => {
    it('should show help message', async () => {
      const { stdout } = await execAsync(`${scriptDir}/restore-db.sh --help`);
      expect(stdout).toContain('MongoDB Database Restore Script');
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('OPTIONS:');
    });

    it('should validate script exists and is executable', () => {
      const scriptPath = path.join(scriptDir, 'restore-db.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const stats = fs.statSync(scriptPath);
      expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Check execute permissions
    });

    it('should show error for missing MONGO_URI in restore', async () => {
      const env = { ...process.env };
      delete env.MONGO_URI;

      try {
        await execAsync(`${scriptDir}/restore-db.sh --dry-run`, {
          env,
          cwd: path.join(__dirname, '..')
        });
        fail('Expected script to fail');
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('MONGO_URI environment variable not set');
      }
    });

    it('should handle missing backup file', async () => {
      const env = {
        ...process.env,
        MONGO_URI: 'mongodb://localhost:27017/test',
        BACKUP_DIR: testBackupDir
      };

      try {
        await execAsync(`${scriptDir}/restore-db.sh --dry-run nonexistent.tar.gz`, {
          env,
          cwd: path.join(__dirname, '..')
        });
        fail('Expected script to fail');
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('Backup file not found');
      }
    });

    it('should handle no backups available', async () => {
      const env = {
        ...process.env,
        MONGO_URI: 'mongodb://localhost:27017/test',
        BACKUP_DIR: testBackupDir
      };

      try {
        await execAsync(`${scriptDir}/restore-db.sh --latest --dry-run`, {
          env,
          cwd: path.join(__dirname, '..')
        });
        fail('Expected script to fail');
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('No backup files found');
      }
    });
  });

  describe('Script Integration', () => {
    it('should have consistent error handling patterns', async () => {
      const backupScript = fs.readFileSync(path.join(scriptDir, 'backup-db.sh'), 'utf8');
      const restoreScript = fs.readFileSync(path.join(scriptDir, 'restore-db.sh'), 'utf8');

      // Check for proper error handling
      expect(backupScript).toContain('set -euo pipefail');
      expect(restoreScript).toContain('set -euo pipefail');

      // Check for logging functions
      expect(backupScript).toContain('log()');
      expect(backupScript).toContain('error()');
      expect(restoreScript).toContain('log()');
      expect(restoreScript).toContain('error()');

      // Check for exit codes
      expect(backupScript).toContain('exit 1');
      expect(backupScript).toContain('exit 0');
      expect(restoreScript).toContain('exit 1');
      expect(restoreScript).toContain('exit 0');
    });

    it('should have proper parameter validation', () => {
      const restoreScript = fs.readFileSync(path.join(scriptDir, 'restore-db.sh'), 'utf8');

      // Check for argument parsing
      expect(restoreScript).toContain('while [[ $# -gt 0 ]]');
      expect(restoreScript).toContain('case $1 in');
      expect(restoreScript).toContain('--help');
      expect(restoreScript).toContain('--dry-run');
      expect(restoreScript).toContain('--force');
    });

    it('should generate machine-readable output', () => {
      const backupScript = fs.readFileSync(path.join(scriptDir, 'backup-db.sh'), 'utf8');
      const restoreScript = fs.readFileSync(path.join(scriptDir, 'restore-db.sh'), 'utf8');

      // Check for structured output
      expect(backupScript).toContain('BACKUP_SUCCESS=');
      expect(backupScript).toContain('BACKUP_FILE=');
      expect(restoreScript).toContain('RESTORE_SUCCESS=');
      expect(restoreScript).toContain('RESTORE_DATABASE=');
    });
  });
});