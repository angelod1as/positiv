import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchResult, ProfileMatchingService, generateUpdateSQL } from './generate-sql-existing-profiles';
import type { Database } from '~/types/database/kysely.types';
import type { Selectable } from 'kysely';

type Profile = Selectable<Database['profiles']>;

describe('ProfileMatchingService', () => {
  let service: ProfileMatchingService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      selectFrom: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn(),
    };
    service = new ProfileMatchingService(mockDb);
  });

  describe('100% certainty matching (email AND phone)', () => {
    it('should return 100% certainty when single profile matches both email and phone', async () => {
      const csvProfile = {
        email: 'test@example.com',
        celular: '11999999999',
        nome: 'Test User',
      };

      const existingProfile: Profile = {
        id: 'uuid-123',
        email: 'test@example.com',
        phone: 11999999999,
        full_name: 'Test User',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      mockDb.execute.mockResolvedValue([existingProfile]);

      const result = await service.findMatches(csvProfile);

      expect(result.certainty).toBe(100);
      expect(result.matchType).toBe('email_and_phone');
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].id).toBe('uuid-123');
      expect(result.reason).toContain('Matched by both email AND phone');
    });

    it('should handle phone number formatting variations', async () => {
      const csvProfile = {
        email: 'test@example.com',
        celular: '(11) 99999-9999', // formatted
        nome: 'Test User',
      };

      const existingProfile: Profile = {
        id: 'uuid-123',
        email: 'test@example.com',
        phone: 11999999999, // unformatted
        full_name: 'Test User',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      mockDb.execute.mockResolvedValue([existingProfile]);

      const result = await service.findMatches(csvProfile);

      expect(result.certainty).toBe(100);
      expect(result.matchType).toBe('email_and_phone');
    });
  });

  describe('50% certainty matching (email OR phone only)', () => {
    it('should return 50% certainty when matched by email only', async () => {
      const csvProfile = {
        email: 'test@example.com',
        celular: '11999999999',
        nome: 'Test User',
      };

      const existingProfile: Profile = {
        id: 'uuid-123',
        email: 'test@example.com',
        phone: null, // No phone
        full_name: 'Test User',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      mockDb.execute.mockResolvedValue([existingProfile]);

      const result = await service.findMatches(csvProfile);

      expect(result.certainty).toBe(50);
      expect(result.matchType).toBe('email_only');
      expect(result.profiles).toHaveLength(1);
      expect(result.reason).toContain('Matched by email only');
    });

    it('should return 50% certainty when matched by phone only', async () => {
      const csvProfile = {
        email: 'test@example.com',
        celular: '11999999999',
        nome: 'Test User',
      };

      const existingProfile: Profile = {
        id: 'uuid-123',
        email: 'different@example.com', // Different email
        phone: 11999999999,
        full_name: 'Test User',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      mockDb.execute.mockResolvedValue([existingProfile]);

      const result = await service.findMatches(csvProfile);

      expect(result.certainty).toBe(50);
      expect(result.matchType).toBe('phone_only');
      expect(result.profiles).toHaveLength(1);
      expect(result.reason).toContain('Matched by phone only');
    });
  });

  describe('0% certainty/conflict detection', () => {
    it('should return 0% certainty when different profiles match different fields', async () => {
      const csvProfile = {
        email: 'test@example.com',
        celular: '11999999999',
        nome: 'Test User',
      };

      const profileWithEmail: Profile = {
        id: 'uuid-123',
        email: 'test@example.com',
        phone: null,
        full_name: 'Test User 1',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      const profileWithPhone: Profile = {
        id: 'uuid-456',
        email: 'different@example.com',
        phone: 11999999999,
        full_name: 'Test User 2',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      mockDb.execute.mockResolvedValue([profileWithEmail, profileWithPhone]);

      const result = await service.findMatches(csvProfile);

      expect(result.certainty).toBe(0);
      expect(result.matchType).toBe('conflict');
      expect(result.profiles).toHaveLength(2);
      expect(result.reason).toContain('CONFLICT: Different profiles match different fields');
    });

    it('should handle multiple profiles with same email', async () => {
      const csvProfile = {
        email: 'test@example.com',
        celular: '11999999999',
        nome: 'Test User',
      };

      const profile1: Profile = {
        id: 'uuid-123',
        email: 'test@example.com',
        phone: null,
        full_name: 'Test User 1',
        created_at: new Date().toISOString(),
        user_id: 'user-123',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      const profile2: Profile = {
        id: 'uuid-456',
        email: 'test@example.com',
        phone: null,
        full_name: 'Test User 2',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      };

      mockDb.execute.mockResolvedValue([profile1, profile2]);

      const result = await service.findMatches(csvProfile);

      expect(result.certainty).toBe(0);
      expect(result.matchType).toBe('conflict');
      expect(result.profiles).toHaveLength(2);
      expect(result.reason).toContain('Multiple profiles');
    });
  });
});

describe('generateUpdateSQL', () => {
  it('should generate SQL with 100% certainty comment', () => {
    const profile: Profile = {
      id: 'uuid-123',
      email: 'test@example.com',
      phone: 11999999999,
      full_name: 'Existing Name',
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
      flag: 'green',
      flag_notes: null,
      how_came_to_us: null,
      where_lives: null,
      is_veteran: null,
    };

    const csvData = {
      nome: 'CSV Name',
      observacao: 'New observation',
    };

    const matchResult: MatchResult = {
      certainty: 100,
      profiles: [profile],
      matchType: 'email_and_phone',
      reason: 'Matched by both email AND phone',
    };

    const sql = generateUpdateSQL(profile, csvData, matchResult);

    expect(sql).toContain('-- CERTAINTY: 100% - Matched by both email AND phone');
    expect(sql).toContain('UPDATE profiles');
    expect(sql).toContain("general_notes = COALESCE(general_notes, 'New observation')");
    expect(sql).toContain("WHERE id = 'uuid-123'");
    expect(sql).not.toContain('full_name'); // Should not update existing data
  });

  it('should generate SQL with 50% certainty comment', () => {
    const profile: Profile = {
      id: 'uuid-123',
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
      flag: 'green',
      flag_notes: null,
      how_came_to_us: null,
      where_lives: null,
      is_veteran: null,
    };

    const csvData = {
      nome: 'CSV Name',
      celular: '11999999999',
      observacao: 'New observation',
    };

    const matchResult: MatchResult = {
      certainty: 50,
      profiles: [profile],
      matchType: 'email_only',
      reason: 'Matched by email only (phone was null)',
    };

    const sql = generateUpdateSQL(profile, csvData, matchResult);

    expect(sql).toContain('-- CERTAINTY: 50% - Matched by email only');
    expect(sql).toContain("phone = COALESCE(phone, 11999999999)");
    expect(sql).toContain("full_name = COALESCE(full_name, 'CSV Name')");
  });

  it('should not generate SQL for conflicts', () => {
    const profiles: Profile[] = [
      {
        id: 'uuid-123',
        email: 'test@example.com',
        phone: null,
        full_name: 'Test 1',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      },
      {
        id: 'uuid-456',
        email: 'different@example.com',
        phone: 11999999999,
        full_name: 'Test 2',
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
        flag: 'green',
        flag_notes: null,
        general_notes: null,
        how_came_to_us: null,
        where_lives: null,
        is_veteran: null,
      },
    ];

    const csvData = {
      nome: 'CSV Name',
      email: 'test@example.com',
      celular: '11999999999',
    };

    const matchResult: MatchResult = {
      certainty: 0,
      profiles,
      matchType: 'conflict',
      reason: 'CONFLICT: Different profiles match different fields',
    };

    const sql = generateUpdateSQL(profiles[0], csvData, matchResult);

    expect(sql).toContain('-- CERTAINTY: 0% - CONFLICT');
    expect(sql).toContain('-- ACTION: Skipped - requires manual review');
    expect(sql).not.toContain('UPDATE profiles');
  });
});