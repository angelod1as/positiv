import { describe, expect, it } from 'vitest';
import {
  getFlag,
  getApprovedStatus,
  getGender,
  getOrientation,
  normalizePhone,
  normalizeRG,
} from './enum-mappings';

describe('enum-mappings', () => {
  describe('getFlag', () => {
    it('should map emoji flags correctly', () => {
      expect(getFlag('🚨')).toBe('red');
      expect(getFlag('🤔')).toBe('yellow');
      expect(getFlag('')).toBe('none');
    });

    it('should return none for undefined or unknown values', () => {
      expect(getFlag(undefined)).toBe('none');
      expect(getFlag('unknown')).toBe('none');
      expect(getFlag(' ')).toBe('none');
    });
  });

  describe('getApprovedStatus', () => {
    it('should map approved statuses correctly', () => {
      expect(getApprovedStatus('TRUE')).toBe('approved');
      expect(getApprovedStatus('FALSE')).toBe('rejected');
      expect(getApprovedStatus('Não')).toBe('rejected');
      expect(getApprovedStatus('Não sei')).toBe('pending');
      expect(getApprovedStatus('Ainda não')).toBe('pending');
      expect(getApprovedStatus('')).toBe('pending');
    });

    it('should return pending for undefined or unknown values', () => {
      expect(getApprovedStatus(undefined)).toBe('pending');
      expect(getApprovedStatus('unknown')).toBe('pending');
    });
  });

  describe('getGender', () => {
    it('should map exact matches', () => {
      expect(getGender('Mulher cis')).toBe('Mulher cis');
      expect(getGender('Mulher trans')).toBe('Mulher trans');
      expect(getGender('Pessoa não binária')).toBe('Pessoa não binária');
    });

    it('should map common variations', () => {
      expect(getGender('NB')).toBe('Pessoa não binária');
      expect(getGender('Não binárie')).toBe('Pessoa não binária');
      expect(getGender('Mulher Trans')).toBe('Mulher trans');
    });

    it('should handle case insensitive matching', () => {
      expect(getGender('mulher cis')).toBe('Mulher cis');
      expect(getGender('MULHER CIS')).toBe('Mulher cis');
    });

    it('should return original value if no mapping found', () => {
      expect(getGender('Unknown Gender')).toBe('Unknown Gender');
    });

    it('should return undefined for empty values', () => {
      expect(getGender(undefined)).toBeUndefined();
      expect(getGender('')).toBeUndefined();
      expect(getGender('  ')).toBeUndefined();
    });
  });

  describe('getOrientation', () => {
    it('should map exact matches', () => {
      expect(getOrientation('Hétero')).toBe('Hétero');
      expect(getOrientation('Bi')).toBe('Bi');
      expect(getOrientation('Pan')).toBe('Pan');
    });

    it('should map variations', () => {
      expect(getOrientation('Heterossexual')).toBe('Hétero');
      expect(getOrientation('Bissexual')).toBe('Bi');
    });

    it('should handle combined orientations by taking the first', () => {
      expect(getOrientation('Bi, Pan')).toBe('Bi');
      expect(getOrientation('Bi, Pan, Demi')).toBe('Bi');
    });

    it('should return original value if no mapping found', () => {
      expect(getOrientation('Unknown')).toBe('Unknown');
    });

    it('should return undefined for empty values', () => {
      expect(getOrientation(undefined)).toBeUndefined();
      expect(getOrientation('')).toBeUndefined();
    });
  });

  describe('normalizePhone', () => {
    it('should remove non-digits', () => {
      expect(normalizePhone('(11) 98765-4321')).toBe('11987654321');
      expect(normalizePhone('11 9 8765-4321')).toBe('11987654321');
      expect(normalizePhone('11.98765.4321')).toBe('11987654321');
    });

    it('should add area code for short numbers', () => {
      expect(normalizePhone('98765-4321')).toBe('11987654321');
      expect(normalizePhone('87654321')).toBe('1187654321');
    });

    it('should keep numbers with area code as is', () => {
      expect(normalizePhone('11987654321')).toBe('11987654321');
      expect(normalizePhone('21987654321')).toBe('21987654321');
    });

    it('should return undefined for empty values', () => {
      expect(normalizePhone(undefined)).toBeUndefined();
      expect(normalizePhone('')).toBeUndefined();
    });
  });

  describe('normalizeRG', () => {
    it('should remove hyphens, dots, and spaces', () => {
      expect(normalizeRG('12.345.678-9')).toBe('123456789');
      expect(normalizeRG('12 345 678 9')).toBe('123456789');
      expect(normalizeRG('12-345-678-9')).toBe('123456789');
    });

    it('should keep alphanumeric characters', () => {
      expect(normalizeRG('123456789X')).toBe('123456789X');
      expect(normalizeRG('MG-12.345.678')).toBe('MG12345678');
    });

    it('should return undefined for empty values', () => {
      expect(normalizeRG(undefined)).toBeUndefined();
      expect(normalizeRG('')).toBeUndefined();
    });
  });
});