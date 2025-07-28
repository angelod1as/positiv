import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

vi.mock('child_process')
vi.mock('fs')

describe('sync-production-db.sh', () => {
  const scriptPath = path.join(__dirname, 'sync-production-db.sh')
  const mockExecSync = vi.mocked(execSync)
  const mockFs = vi.mocked(fs)

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_CONNECT_URL = 'postgres://local:5432/local'
    process.env.LOCAL_DATABASE_URL = 'postgres://local:5432/local'
  })

  afterEach(() => {
    delete process.env.SUPABASE_CONNECT_URL
    delete process.env.LOCAL_DATABASE_URL
  })

  describe('dry-run mode', () => {
    it('should show statistics without making changes', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true)
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('SELECT COUNT')) {
          return Buffer.from('100')
        }
        return Buffer.from('')
      })

      const result = execSync(`bash ${scriptPath} --dry-run`, { encoding: 'utf8' })
      
      expect(result).toContain('DRY RUN MODE')
      expect(result).toContain('Would perform the following operations')
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('pg_dump'))
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('DROP SCHEMA'))
    })

    it('should check if local Supabase is running', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true)
      mockExecSync.mockImplementation(() => {
        throw new Error('Connection refused')
      })

      expect(() => {
        execSync(`bash ${scriptPath} --dry-run`, { encoding: 'utf8' })
      }).toThrow('Local Supabase is not running')
    })
  })

  describe('regular mode', () => {
    it('should require user confirmation', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true)
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('read')) {
          return Buffer.from('no')
        }
        return Buffer.from('')
      })

      const result = execSync(`echo "no" | bash ${scriptPath}`, { encoding: 'utf8' })
      
      expect(result).toContain('ATENÇÃO: Isso apagará TODOS os dados locais')
      expect(result).toContain('Operação cancelada')
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('pg_dump'))
    })

    it('should perform full sync when confirmed', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true)
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('read')) {
          return Buffer.from('sim')
        }
        if (cmd.includes('SELECT COUNT')) {
          return Buffer.from('100')
        }
        return Buffer.from('Success')
      })

      const result = execSync(`echo "sim" | bash ${scriptPath}`, { encoding: 'utf8' })
      
      expect(result).toContain('Baixando dados de produção')
      expect(result).toContain('Limpando banco local')
      expect(result).toContain('Restaurando dados de produção')
      expect(result).toContain('Verificando integridade')
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining('pg_dump'))
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining('DROP SCHEMA'))
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining('psql'))
    })

    it('should create timestamped backup file', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true)
      mockExecSync.mockImplementation(() => Buffer.from('Success'))

      execSync(`echo "sim" | bash ${scriptPath}`, { encoding: 'utf8' })
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/pg_dump.*production-dump-\d{8}-\d{6}\.sql/)
      )
    })

    it('should handle errors gracefully', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true)
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('pg_dump')) {
          throw new Error('Connection failed')
        }
        return Buffer.from('')
      })

      expect(() => {
        execSync(`echo "sim" | bash ${scriptPath}`, { encoding: 'utf8' })
      }).toThrow('Erro ao fazer backup')
    })
  })

  describe('environment validation', () => {
    it('should check for .env.vercel.production file', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(false)

      expect(() => {
        execSync(`bash ${scriptPath} --dry-run`, { encoding: 'utf8' })
      }).toThrow('Arquivo .env.vercel.production não encontrado')
    })

    it('should validate required environment variables', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true)
      delete process.env.SUPABASE_CONNECT_URL

      expect(() => {
        execSync(`bash ${scriptPath} --dry-run`, { encoding: 'utf8' })
      }).toThrow('SUPABASE_CONNECT_URL não está definido')
    })
  })
})