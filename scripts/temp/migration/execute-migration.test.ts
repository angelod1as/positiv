import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('execute-migration.sh', () => {
  const scriptPath = join(__dirname, 'execute-migration.sh');
  const testOutputDir = join(__dirname, 'test-sql-output');
  const insertProfilesPath = join(testOutputDir, 'insert-new-profiles.sql');
  const insertParticipantsPath = join(testOutputDir, 'insert-event-participants.sql');

  beforeEach(() => {
    // Create test directory and files
    if (!existsSync(testOutputDir)) {
      mkdirSync(testOutputDir, { recursive: true });
    }
    
    // Create mock SQL files
    writeFileSync(insertProfilesPath, 'BEGIN;\n-- Test profiles SQL\nCOMMIT;');
    writeFileSync(insertParticipantsPath, 'BEGIN;\n-- Test participants SQL\nCOMMIT;');
    
    // Mock environment variable for testing
    process.env.MIGRATION_DIR = __dirname;
    process.env.SQL_OUTPUT_DIR = testOutputDir;
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    // Clean up environment variables
    delete process.env.MIGRATION_DIR;
    delete process.env.SQL_OUTPUT_DIR;
  });

  it('should fail if insert-new-profiles.sql is missing', () => {
    // Remove the profiles SQL file
    rmSync(insertProfilesPath);
    
    try {
      execSync(`bash ${scriptPath} 2>&1`, { 
        encoding: 'utf8',
        env: { ...process.env, SKIP_DB_CHECK: '1' }
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      expect(err.stdout || err.stderr || err.message).toMatch(/Missing insert-new-profiles.sql/);
    }
  });

  it('should fail if insert-event-participants.sql is missing', () => {
    // Remove the participants SQL file
    rmSync(insertParticipantsPath);
    
    try {
      execSync(`bash ${scriptPath} 2>&1`, { 
        encoding: 'utf8',
        env: { ...process.env, SKIP_DB_CHECK: '1' }
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      expect(err.stdout || err.stderr || err.message).toMatch(/Missing insert-event-participants.sql/);
    }
  });

  it('should exit gracefully when user does not type MIGRATE', () => {
    const result = execSync(`echo "cancel" | bash ${scriptPath}`, { 
      encoding: 'utf8',
      env: { ...process.env, SKIP_DB_CHECK: '1', AUTO_CONFIRM: '0' }
    });
    
    expect(result).toContain('Migration cancelled');
  });

  it('should show migration summary with correct counts', () => {
    // Create SQL files with known content
    const profilesSQL = `BEGIN;
-- Insert new orphan profiles (without user_id)
-- Total: 3 profiles
INSERT INTO profiles (...) VALUES (...);
INSERT INTO profiles (...) VALUES (...);
INSERT INTO profiles (...) VALUES (...);
COMMIT;`;
    
    const participantsSQL = `BEGIN;
-- Insert event participations
INSERT INTO event_participants (...) VALUES (...);
INSERT INTO event_participants (...) VALUES (...);
INSERT INTO event_participants (...) VALUES (...);
INSERT INTO event_participants (...) VALUES (...);
INSERT INTO event_participants (...) VALUES (...);
COMMIT;`;
    
    writeFileSync(insertProfilesPath, profilesSQL);
    writeFileSync(insertParticipantsPath, participantsSQL);
    
    const result = execSync(`echo "cancel" | bash ${scriptPath}`, { 
      encoding: 'utf8',
      env: { ...process.env, SKIP_DB_CHECK: '1', AUTO_CONFIRM: '0' }
    });
    
    expect(result).toContain('Migration Summary');
    expect(result).toContain('New profiles: 3');
    expect(result).toContain('Event participations: 5');
  });

  it('should check for prerequisite files', () => {
    const result = execSync(`echo "cancel" | bash ${scriptPath}`, { 
      encoding: 'utf8',
      env: { ...process.env, SKIP_DB_CHECK: '1', AUTO_CONFIRM: '0' }
    });
    
    expect(result).toContain('Checking prerequisites');
  });

  it('should display warning message before migration', () => {
    const result = execSync(`echo "cancel" | bash ${scriptPath}`, { 
      encoding: 'utf8',
      env: { ...process.env, SKIP_DB_CHECK: '1', AUTO_CONFIRM: '0' }
    });
    
    expect(result).toContain('WARNING: This will modify the database');
    expect(result).toContain("Type 'MIGRATE' to proceed");
  });
});