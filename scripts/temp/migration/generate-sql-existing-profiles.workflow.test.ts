import { describe, it, expect } from 'vitest';
import { generateUpdateSQL, type MatchResult } from './generate-sql-existing-profiles';
import type { ValidatedProfile } from './validate-profiles-csv';
import type { Database } from '~/types/database/kysely.types';
import type { Selectable } from 'kysely';

type Profile = Selectable<Database['profiles']>;

describe('Profile Update SQL Generation Workflow', () => {
  it('should handle complete workflow with mixed certainty levels', () => {
    // Test data
    const testProfiles: Profile[] = [
      {
        id: 'uuid-100-percent',
        email: 'match100@example.com',
        phone: 11999999999,
        full_name: 'Existing User 100',
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
      },
      {
        id: 'uuid-50-percent',
        email: 'match50@example.com',
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
      },
    ];

    const csvProfiles: Partial<ValidatedProfile>[] = [
      {
        nome: 'CSV User 100',
        email: 'match100@example.com',
        celular: '11999999999',
        observacao: 'Note for 100% match',
      },
      {
        nome: 'CSV User 50',
        email: 'match50@example.com',
        celular: '11888888888',
        observacao: 'Note for 50% match',
      },
      {
        nome: 'Conflict User',
        email: 'conflict@example.com',
        celular: '11777777777',
        observacao: 'This will conflict',
      },
    ];

    // Test 100% certainty SQL generation
    const match100: MatchResult = {
      certainty: 100,
      profiles: [testProfiles[0]],
      matchType: 'email_and_phone',
      reason: 'Matched by both email AND phone',
    };

    const sql100 = generateUpdateSQL(testProfiles[0], csvProfiles[0], match100);
    
    expect(sql100).toContain('-- CERTAINTY: 100%');
    expect(sql100).toContain('UPDATE profiles');
    expect(sql100).toContain("general_notes = COALESCE(general_notes, 'Note for 100% match')");
    expect(sql100).not.toContain('full_name'); // Should not update existing name

    // Test 50% certainty SQL generation
    const match50: MatchResult = {
      certainty: 50,
      profiles: [testProfiles[1]],
      matchType: 'email_only',
      reason: 'Matched by email only (phone was null)',
    };

    const sql50 = generateUpdateSQL(testProfiles[1], csvProfiles[1], match50);
    
    expect(sql50).toContain('-- CERTAINTY: 50%');
    expect(sql50).toContain("phone = COALESCE(phone, 11888888888)");
    expect(sql50).toContain("full_name = COALESCE(full_name, 'CSV User 50')");
    expect(sql50).toContain("general_notes = COALESCE(general_notes, 'Note for 50% match')");

    // Test conflict SQL generation
    const conflictProfiles: Profile[] = [
      { ...testProfiles[0], id: 'uuid-conflict-1', email: 'conflict@example.com', phone: null },
      { ...testProfiles[0], id: 'uuid-conflict-2', email: 'other@example.com', phone: 11777777777 },
    ];

    const matchConflict: MatchResult = {
      certainty: 0,
      profiles: conflictProfiles,
      matchType: 'conflict',
      reason: 'CONFLICT: Different profiles match different fields',
    };

    const sqlConflict = generateUpdateSQL(conflictProfiles[0], csvProfiles[2], matchConflict);
    
    expect(sqlConflict).toContain('-- CERTAINTY: 0%');
    expect(sqlConflict).toContain('-- ACTION: Skipped');
    expect(sqlConflict).not.toContain('UPDATE profiles');
  });

  it('should handle edge cases correctly', () => {
    const profile: Profile = {
      id: 'uuid-edge',
      email: 'edge@example.com',
      phone: 11999999999,
      full_name: 'Edge User',
      social_name: 'Edge Social',
      general_notes: 'Existing note',
      created_at: new Date().toISOString(),
      user_id: null,
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
      nome: 'Should not update',
      nome_social: 'Should not update',
      email: 'edge@example.com',
      celular: '11999999999',
      observacao: 'Should not update',
    };

    const match: MatchResult = {
      certainty: 100,
      profiles: [profile],
      matchType: 'email_and_phone',
      reason: 'Matched by both email AND phone',
    };

    const sql = generateUpdateSQL(profile, csvData, match);
    
    // All fields are already populated, so no updates needed
    expect(sql).toContain('-- No updates needed');
    expect(sql).not.toContain('UPDATE profiles');
  });

  it('should properly escape SQL injection attempts', () => {
    const profile: Profile = {
      id: 'uuid-inject',
      email: 'inject@example.com',
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
      nome: "Robert'); DROP TABLE profiles; --",
      observacao: "'; DELETE FROM profiles WHERE '1'='1",
    };

    const match: MatchResult = {
      certainty: 50,
      profiles: [profile],
      matchType: 'email_only',
      reason: 'Matched by email only',
    };

    const sql = generateUpdateSQL(profile, csvData, match);
    
    // Check that single quotes are properly escaped in the SQL statement
    expect(sql).toContain("''"); // Escaped quotes
    // The actual SQL should have escaped quotes, not the raw injection attempts
    expect(sql).toContain("Robert''); DROP TABLE profiles;");
    expect(sql).toContain("'''; DELETE FROM profiles WHERE ''1''=''1");
  });

  it('should format phone numbers correctly', () => {
    const profile: Profile = {
      id: 'uuid-phone',
      email: 'phone@example.com',
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
      celular: '(11) 99999-9999', // Formatted phone
    };

    const match: MatchResult = {
      certainty: 50,
      profiles: [profile],
      matchType: 'email_only',
      reason: 'Matched by email only',
    };

    const sql = generateUpdateSQL(profile, csvData, match);
    
    // Phone should be normalized to number in the UPDATE statement
    expect(sql).toContain('phone = COALESCE(phone, 11999999999)');
    // The formatted version only appears in the comment, not in the actual SQL
    expect(sql).toContain('-- CSV: Email: null, Phone: (11) 99999-9999');
  });
});