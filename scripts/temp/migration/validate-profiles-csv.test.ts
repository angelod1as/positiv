import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import { validateCSV } from './validate-profiles-csv';

vi.mock('fs/promises');

describe('validateCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSV parsing', () => {
    it('should parse a valid CSV file', async () => {
      const csvContent = `nome,email,celular,observacao,04/02/23,Sáfica (24/02/24)
João Silva,joao@example.com,11999999999,Observação teste,X,
Maria Santos,maria@example.com,(11) 88888-8888,,X,X`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result.stats.total).toBe(2);
      expect(result.valid).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle CSV with missing required fields', async () => {
      const csvContent = `nome,email,celular
,invalid@email,11999999999
Test User,test@example.com,`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result.stats.total).toBe(2);
      expect(result.valid).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].errors).toContain('Nome é obrigatório');
    });
  });

  describe('Event columns detection', () => {
    it('should detect event columns dynamically', async () => {
      const csvContent = `nome,email,04/02/23,Sáfica (24/02/24),Fim de ânus
João Silva,joao@example.com,X,,sim`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result.eventColumns).toEqual(['04/02/23', 'Sáfica (24/02/24)', 'Fim de ânus']);
      expect(result.valid[0].events).toEqual({
        '04/02/23': true,
        'Sáfica (24/02/24)': false,
        'Fim de ânus': true,
      });
    });

    it('should treat "não" as false for event participation', async () => {
      const csvContent = `nome,04/02/23,Sáfica (24/02/24)
João Silva,não,X`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result.valid[0].events).toEqual({
        '04/02/23': false,
        'Sáfica (24/02/24)': true,
      });
    });
  });

  describe('Data normalization', () => {
    it('should normalize phone numbers', async () => {
      const csvContent = `nome,celular
João Silva,(11) 99999-9999
Maria Santos,+55 11 8 8888-8888`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result.valid[0].celular).toBe('11999999999');
      expect(result.valid[1].celular).toBe('5511888888888');
    });

    it('should normalize email to lowercase', async () => {
      const csvContent = `nome,email
João Silva,JOAO@EXAMPLE.COM`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result.valid[0].email).toBe('joao@example.com');
    });
  });

  describe('Error handling', () => {
    it('should collect validation errors with row numbers', async () => {
      const csvContent = `nome,email
João Silva,invalid-email
,test@example.com`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].errors).toContain('Email inválido');
      expect(result.errors[1].row).toBe(2);
      expect(result.errors[1].errors).toContain('Nome é obrigatório');
    });

    it('should handle file read errors', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      await expect(validateCSV('nonexistent.csv')).rejects.toThrow('File not found');
    });
  });

  describe('Output format', () => {
    it('should generate correct validation result structure', async () => {
      const csvContent = `nome,email,celular,observacao,04/02/23
João Silva,joao@example.com,11999999999,Test note,X`;

      vi.mocked(readFile).mockResolvedValue(Buffer.from(csvContent));

      const result = await validateCSV('test.csv');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('eventColumns');

      expect(result.valid[0]).toEqual({
        nome: 'João Silva',
        email: 'joao@example.com',
        celular: '11999999999',
        observacao: 'Test note',
        events: {
          '04/02/23': true,
        },
      });

      expect(result.stats).toEqual({
        total: 1,
        valid: 1,
        invalid: 0,
        warnings: [],
      });
    });
  });
});