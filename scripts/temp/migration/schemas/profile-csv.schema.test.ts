import { describe, expect, it } from 'vitest';
import { ProfileCSVRowSchema, normalizePhone } from './profile-csv.schema';

describe('ProfileCSVRowSchema', () => {
  describe('basic field validation', () => {
    it('should validate a complete valid row', () => {
      const validRow = {
        nome: 'João da Silva',
        nome_social: 'João',
        genero: 'Masculino',
        orientacao: 'Heterossexual',
        pronomes: 'ele/dele',
        email: 'joao@example.com',
        celular: '11999999999',
        rg: '12.345.678-9',
        bandeira: 'Visa',
        aprovado_futuras_festas: 'sim',
        observacao: 'Cliente VIP',
      };

      const result = ProfileCSVRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    it('should require nome field', () => {
      const invalidRow = {
        email: 'test@example.com',
      };

      const result = ProfileCSVRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Nome é obrigatório');
      }
    });

    it('should validate email format', () => {
      const invalidRow = {
        nome: 'Test User',
        email: 'invalid-email',
      };

      const result = ProfileCSVRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find(issue => issue.path[0] === 'email');
        expect(emailError?.message).toBe('Email inválido');
      }
    });

    it('should allow empty string for email', () => {
      const validRow = {
        nome: 'Test User',
        email: '',
      };

      const result = ProfileCSVRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    it('should handle all optional fields', () => {
      const minimalRow = {
        nome: 'Test User',
      };

      const result = ProfileCSVRowSchema.safeParse(minimalRow);
      expect(result.success).toBe(true);
    });
  });

  describe('normalizePhone', () => {
    it('should remove all non-numeric characters', () => {
      expect(normalizePhone('(11) 99999-9999')).toBe('11999999999');
      expect(normalizePhone('+55 11 9 9999-9999')).toBe('5511999999999');
      expect(normalizePhone('11.99999.9999')).toBe('11999999999');
    });

    it('should handle undefined', () => {
      expect(normalizePhone(undefined)).toBe(undefined);
    });

    it('should handle empty string', () => {
      expect(normalizePhone('')).toBe('');
    });

    it('should handle phone with spaces and special chars', () => {
      expect(normalizePhone('+55 (11) 9 9999-9999')).toBe('5511999999999');
    });
  });
});