import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('sync-production-db.sh', () => {
  let tempDir: string
  let scriptPath: string
  let envFile: string
  let localEnvFile: string
  
  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-db-test-'))
    
    // Copy script to temp directory
    const originalScriptPath = path.join(__dirname, 'sync-production-db.sh')
    scriptPath = path.join(tempDir, 'sync-production-db.sh')
    fs.copyFileSync(originalScriptPath, scriptPath)
    fs.chmodSync(scriptPath, '755')
    
    // Create environment files in temp directory
    envFile = path.join(tempDir, '.env.vercel.production')
    localEnvFile = path.join(tempDir, '.env')
    
    const mockProductionEnv = `SUPABASE_CONNECT_URL="postgres://mock:5432/production"`
    const mockLocalEnv = `SUPABASE_CONNECT_URL="postgres://mock:5432/local"`
    
    fs.writeFileSync(envFile, mockProductionEnv)
    fs.writeFileSync(localEnvFile, mockLocalEnv)
    
    // Update script to use temp directory
    const scriptContent = fs.readFileSync(scriptPath, 'utf8')
    const updatedScript = scriptContent.replace(
      'PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"',
      `PROJECT_ROOT="${tempDir}"`
    )
    fs.writeFileSync(scriptPath, updatedScript)
  })

  afterEach(() => {
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (_e) {
      // Ignore errors if directory doesn't exist
    }
  })

  describe('dry-run mode', () => {
    it('should show statistics without making changes', () => {
      try {
        // Mock psql commands by creating a wrapper script
        const mockPsqlScript = `#!/bin/bash
if [[ "$1" == *"SELECT 1"* ]]; then
  exit 0
elif [[ "$1" == *"SELECT COUNT"* ]]; then
  echo "100"
fi
`
        const psqlPath = path.join(tempDir, 'psql')
        fs.writeFileSync(psqlPath, mockPsqlScript)
        fs.chmodSync(psqlPath, '755')
        
        const result = execSync(`PATH="${tempDir}:$PATH" bash ${scriptPath} --dry-run 2>&1`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: `${tempDir}:${process.env.PATH}` }
        })
        
        expect(result).toContain('DRY RUN MODE')
        expect(result).toContain('Would perform the following operations')
        expect(result).not.toContain('Error backing up')
        
        fs.unlinkSync(psqlPath)
      } catch (error) {
        // If local Supabase is not running, skip this test
        if (error instanceof Error && error.message.includes('Local Supabase is not running')) {
          // Skip test if local Supabase is not running
          return
        }
        throw error
      }
    })
  })

  describe('regular mode', () => {
    it('should require user confirmation', () => {
      // Create mock psql to bypass connection check
      const mockPsqlScript = `#!/bin/bash
if [[ "$1" == *"SELECT 1"* ]]; then
  exit 0
fi
`
      const psqlPath = path.join(tempDir, 'psql')
      fs.writeFileSync(psqlPath, mockPsqlScript)
      fs.chmodSync(psqlPath, '755')
      
      try {
        const result = execSync(`PATH="${tempDir}:$PATH" echo "no" | bash ${scriptPath} 2>&1`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: `${tempDir}:${process.env.PATH}` }
        })
        
        expect(result).toContain('WARNING: This will DELETE ALL local data')
        expect(result).toContain('Operation cancelled')
      } finally {
        fs.unlinkSync(psqlPath)
      }
    })

    it('should require double confirmation for safety', () => {
      // Create mock psql to bypass connection check
      const mockPsqlScript = `#!/bin/bash
if [[ "$1" == *"SELECT 1"* ]]; then
  exit 0
fi
`
      const psqlPath = path.join(tempDir, 'psql')
      fs.writeFileSync(psqlPath, mockPsqlScript)
      fs.chmodSync(psqlPath, '755')
      
      try {
        // First confirm with yes, but cancel on second confirmation
        const result = execSync(`PATH="${tempDir}:$PATH" printf "yes\\nno\\n" | bash ${scriptPath} 2>&1`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: `${tempDir}:${process.env.PATH}` }
        })
        
        expect(result).toContain('FINAL CONFIRMATION REQUIRED')
        expect(result).toContain('Operation cancelled')
      } finally {
        fs.unlinkSync(psqlPath)
      }
    })
  })

  describe('environment validation', () => {
    it('should check for .env.vercel.production file', () => {
      fs.unlinkSync(envFile)
      
      try {
        execSync(`bash ${scriptPath} --dry-run 2>&1`, { encoding: 'utf8' })
        throw new Error('Should have failed')
      } catch (error) {
        let output = ''
        if (error && typeof error === 'object' && 'stdout' in error) {
          output = error.stdout as string
        } else if (error && typeof error === 'object' && 'stderr' in error) {
          output = error.stderr as string
        } else if (error instanceof Error) {
          output = error.message
        }
        expect(output).toContain('.env.vercel.production file not found')
      }
    })

    it('should validate required environment variables', () => {
      fs.writeFileSync(envFile, 'INVALID_VAR=test\n')
      
      // The script should fail when SUPABASE_CONNECT_URL is missing
      expect(() => {
        execSync(`bash ${scriptPath} --dry-run`, { 
          encoding: 'utf8',
          stdio: 'inherit'  // This will help us see any output during test
        })
      }).toThrow()
    })
  })
})