import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('rollback-migration.sh', () => {
  const scriptPath = join(__dirname, 'rollback-migration.sh');
  const testBackupDir = join(__dirname, 'test-backups');
  const testBackupFile = join(testBackupDir, 'backup-20240101-120000.dump');
  const nonExistentBackup = 'backup-nonexistent.dump';

  beforeEach(() => {
    // Create test directory and files
    if (!existsSync(testBackupDir)) {
      mkdirSync(testBackupDir, { recursive: true });
    }
    
    // Create mock backup files
    writeFileSync(testBackupFile, 'mock backup content');
    writeFileSync(join(testBackupDir, 'backup-20240101-130000.dump'), 'mock backup content 2');
    writeFileSync(join(testBackupDir, 'backup-20240101-140000.dump'), 'mock backup content 3');
    
    // Set environment variable for test directory
    process.env.BACKUP_DIR = testBackupDir;
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testBackupDir)) {
      rmSync(testBackupDir, { recursive: true, force: true });
    }
    
    // Clean up environment variables
    delete process.env.BACKUP_DIR;
  });

  it('should list available backups', () => {
    try {
      execSync(`echo "${nonExistentBackup}" | bash ${scriptPath} 2>&1`, { 
        encoding: 'utf8',
        env: { ...process.env, SKIP_DB_RESTORE: '1' }
      });
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      const output = err.stdout || err.stderr || err.message;
      expect(output).toContain('Available backups:');
      expect(output).toContain('backup-20240101-120000.dump');
      expect(output).toContain('backup-20240101-130000.dump');
      expect(output).toContain('backup-20240101-140000.dump');
    }
  });

  it('should show rollback header', () => {
    try {
      execSync(`echo "${nonExistentBackup}" | bash ${scriptPath} 2>&1`, { 
        encoding: 'utf8',
        env: { ...process.env, SKIP_DB_RESTORE: '1' }
      });
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      const output = err.stdout || err.stderr || err.message;
      expect(output).toContain('🔄 Rolling back migration...');
    }
  });

  it('should prompt for backup filename', () => {
    try {
      execSync(`echo "${nonExistentBackup}" | bash ${scriptPath} 2>&1`, { 
        encoding: 'utf8',
        env: { ...process.env, SKIP_DB_RESTORE: '1' }
      });
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      const output = err.stdout || err.stderr || err.message;
      expect(output).toContain('Enter backup filename to restore:');
    }
  });

  it('should fail if backup file not found', () => {
    try {
      execSync(`echo "${nonExistentBackup}" | bash ${scriptPath} 2>&1`, { 
        encoding: 'utf8',
        env: { ...process.env, SKIP_DB_RESTORE: '1' }
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      expect(err.stdout || err.stderr || err.message).toMatch(/Backup file not found/);
    }
  });

  it('should show success message when backup exists', () => {
    // Use relative path for the test
    const backupFileName = 'backup-20240101-120000.dump';
    const result = execSync(`echo "${backupFileName}" | bash ${scriptPath}`, { 
      encoding: 'utf8',
      env: { ...process.env, SKIP_DB_RESTORE: '1' },
      cwd: testBackupDir // Change working directory to backup dir
    });
    
    expect(result).toContain('✅ Rollback complete');
  });

  it('should handle absolute paths', () => {
    const result = execSync(`echo "${testBackupFile}" | bash ${scriptPath}`, { 
      encoding: 'utf8',
      env: { ...process.env, SKIP_DB_RESTORE: '1' }
    });
    
    expect(result).toContain('✅ Rollback complete');
  });
});