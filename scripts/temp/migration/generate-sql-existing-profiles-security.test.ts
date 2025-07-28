import { describe, it, expect } from 'vitest';
import { generateUpdateSQL, type MatchResult } from './generate-sql-existing-profiles';
import type { ValidatedProfile } from './validate-profiles-csv';
import type { Database } from '~/types/database/kysely.types';
import type { Selectable } from 'kysely';

type Profile = Selectable<Database['profiles']>;

describe('SQL Generation Security Tests', () => {
  it('should throw error for invalid UUID format', () => {
    const profile: Profile = {
      id: 'invalid-uuid-format',
      email: 'test@example.com',
      phone: null,
      full_name: null,
      general_notes: null,
      created_at: new Date().toISOString(),
      user_id: null,
      social_name: null,
      date_of_birth: null,
      gender: null,
      orientation: null,
      pronouns: null,
      cpf: null,
      rg: null,
      rg_issuer: null,
      allow_marketing_email: null,
      approved_to_attend: 'approved',
      basic_data_filled: true,
      flag: 'none',
      flag_notes: null,
      how_came_to_us: null,
      where_lives: null,
      is_veteran: null,
    };

    const csvData: Partial<ValidatedProfile> = {
      nome: 'Test User',
    };

    const match: MatchResult = {
      certainty: 100,
      profiles: [profile],
      matchType: 'email_and_phone',
      reason: 'Matched',
    };

    expect(() => generateUpdateSQL(profile, csvData, match)).toThrow('Invalid profile ID format');
  });

  it('should accept valid UUID formats', () => {
    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ];

    validUUIDs.forEach(uuid => {
      const profile: Profile = {
        id: uuid,
        email: 'test@example.com',
        phone: null,
        full_name: null,
        general_notes: null,
        created_at: new Date().toISOString(),
        user_id: null,
        social_name: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        pronouns: null,
        cpf: null,
        rg: null,
        rg_issuer: null,
        allow_marketing_email: null,
        approved_to_attend: 'approved',
        basic_data_filled: true,
        flag: 'none',
        flag_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      const csvData: Partial<ValidatedProfile> = {
        nome: 'Test User',
      };

      const match: MatchResult = {
        certainty: 100,
        profiles: [profile],
        matchType: 'email_and_phone',
        reason: 'Matched',
      };

      expect(() => generateUpdateSQL(profile, csvData, match)).not.toThrow();
    });
  });

  it('should escape null bytes in strings', () => {
    const profile: Profile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      phone: null,
      full_name: null,
      general_notes: null,
      created_at: new Date().toISOString(),
      user_id: null,
      social_name: null,
      date_of_birth: null,
      gender: null,
      orientation: null,
      pronouns: null,
      cpf: null,
      rg: null,
      rg_issuer: null,
      allow_marketing_email: null,
      approved_to_attend: 'approved',
      basic_data_filled: true,
      flag: 'none',
      flag_notes: null,
      how_came_to_us: null,
      where_lives: null,
      is_veteran: null,
    };

    const csvData: Partial<ValidatedProfile> = {
      nome: 'Test' + String.fromCharCode(0) + 'User',
      observacao: 'Note with ' + String.fromCharCode(0) + ' null byte',
    };

    const match: MatchResult = {
      certainty: 100,
      profiles: [profile],
      matchType: 'email_and_phone',
      reason: 'Matched',
    };

    const sql = generateUpdateSQL(profile, csvData, match);
    
    // Null bytes should be removed from the actual SQL values
    const sqlLines = sql.split('\n');
    const updateLines = sqlLines.filter(line => line.includes('COALESCE'));
    
    // Check that null bytes are removed from actual SQL statements
    updateLines.forEach(line => {
      expect(line).not.toContain('\0');
    });
    
    expect(sql).toContain('TestUser');
    expect(sql).toContain('Note with  null byte');
  });

  it('should handle complex escape sequences', () => {
    const profile: Profile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      phone: null,
      full_name: null,
      general_notes: null,
      created_at: new Date().toISOString(),
      user_id: null,
      social_name: null,
      date_of_birth: null,
      gender: null,
      orientation: null,
      pronouns: null,
      cpf: null,
      rg: null,
      rg_issuer: null,
      allow_marketing_email: null,
      approved_to_attend: 'approved',
      basic_data_filled: true,
      flag: 'none',
      flag_notes: null,
      how_came_to_us: null,
      where_lives: null,
      is_veteran: null,
    };

    const csvData: Partial<ValidatedProfile> = {
      nome: "\\'; DROP TABLE profiles; --\\",
      observacao: "\\\\' OR '1'='1",
    };

    const match: MatchResult = {
      certainty: 100,
      profiles: [profile],
      matchType: 'email_and_phone',
      reason: 'Matched',
    };

    const sql = generateUpdateSQL(profile, csvData, match);
    
    // Should have proper escaping
    expect(sql).toContain("\\\\''; DROP TABLE profiles; --\\\\");
    expect(sql).toContain("\\\\\\\\'' OR ''1''=''1");
  });
});