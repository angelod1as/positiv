import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('sync-production-db.sh', () => {
  const scriptPath = path.join(__dirname, 'sync-production-db.sh')
  const envFile = path.join(__dirname, '../../../.env.vercel.production')
  const localEnvFile = path.join(__dirname, '../../../.env')
  
  beforeEach(() => {
    // Create mock environment files for testing
    const mockProductionEnv = `SUPABASE_CONNECT_URL="postgres://mock:5432/production"`
    const mockLocalEnv = `SUPABASE_CONNECT_URL="postgres://mock:5432/local"`
    
    fs.writeFileSync(envFile, mockProductionEnv)
    fs.writeFileSync(localEnvFile, mockLocalEnv)
  })

  afterEach(() => {
    // Clean up mock files
    try {
      fs.unlinkSync(envFile)
      fs.unlinkSync(localEnvFile)
    } catch (_e) {
      // Ignore errors if files don't exist
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
        const psqlPath = path.join(__dirname, 'psql')
        fs.writeFileSync(psqlPath, mockPsqlScript)
        fs.chmodSync(psqlPath, '755')
        
        const result = execSync(`PATH="${__dirname}:$PATH" bash ${scriptPath} --dry-run 2>&1`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: `${__dirname}:${process.env.PATH}` }
        })
        
        expect(result).toContain('DRY RUN MODE')
        expect(result).toContain('Would perform the following operations')
        expect(result).not.toContain('Erro ao fazer backup')
        
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
      const psqlPath = path.join(__dirname, 'psql')
      fs.writeFileSync(psqlPath, mockPsqlScript)
      fs.chmodSync(psqlPath, '755')
      
      try {
        const result = execSync(`PATH="${__dirname}:$PATH" echo "no" | bash ${scriptPath} 2>&1`, { 
          encoding: 'utf8',
          env: { ...process.env, PATH: `${__dirname}:${process.env.PATH}` }
        })
        
        expect(result).toContain('ATENÇÃO: Isso apagará TODOS os dados locais')
        expect(result).toContain('Operação cancelada')
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
        expect(output).toContain('Arquivo .env.vercel.production não encontrado')
      }
    })

    it('should validate required environment variables', () => {
      fs.writeFileSync(envFile, 'INVALID_VAR=test')
      
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
        expect(output).toContain('SUPABASE_CONNECT_URL não está definido')
      }
    })
  })
})