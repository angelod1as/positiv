import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { db } from '~/lib/supabase/db.server';
import type { Database } from '~/types/database/kysely.types';
import type { Insertable } from 'kysely';

// Mock the database module
vi.mock('~/lib/supabase/db.server', () => {
  const mockDb = {
    selectFrom: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    insertInto: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    deleteFrom: vi.fn().mockReturnThis(),
  };
  return { db: mockDb };
});

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  };
});

describe('generate-sql-existing-profiles integration', () => {
  const testDir = process.cwd();
  const validatedFile = join(testDir, 'validated-profiles.json');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should process validated profiles in dry-run mode', async () => {
    // Mock validated profiles file
    const validatedData = {
      valid: [
        {
          nome: 'Test User 1',
          email: 'test1@example.com',
          celular: '11999999999',
          observacao: 'New note 1',
        },
        {
          nome: 'Test User 2',
          email: 'test2@example.com',
          celular: '11888888888',
          observacao: 'New note 2',
        },
        {
          nome: 'Test User 3',
          email: 'test3@example.com',
          celular: null,
          observacao: 'New note 3',
        },
      ],
      errors: [],
      stats: { total: 3, valid: 3, invalid: 0, warnings: [] },
      eventColumns: [],
    };

    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(validatedData));

    // Mock database responses
    const mockProfiles: Array<Insertable<Database['profiles']>> = [
      {
        id: 'uuid-1',
        email: 'test1@example.com',
        phone: 11999999999,
        full_name: 'Existing User 1',
        general_notes: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'uuid-2',
        email: 'test2@example.com',
        phone: null,
        full_name: null,
        general_notes: null,
        created_at: new Date().toISOString(),
      },
    ];

    // Mock database calls
    vi.mocked(db.execute)
      .mockResolvedValueOnce([mockProfiles[0]]) // First profile - 100% match
      .mockResolvedValueOnce([mockProfiles[1]]) // Second profile - 50% match (email only)
      .mockResolvedValueOnce([]); // Third profile - no match (new profile)

    // Import and run the main function
    const module = await import('./generate-sql-existing-profiles');
    
    // Create a test-specific main function
    const testMain = async () => {
      const { generateReport, printReport } = module as any;
      const { report, sqlStatements } = await generateReport(validatedData.valid, false);
      
      // Verify report structure
      expect(report).toMatchObject({
        mode: 'dry-run',
        totalProcessed: 3,
        matched: {
          byBoth: 1,
          byEmail: 1,
          byPhone: 0,
          total: 2,
        },
        newProfiles: 1,
        conflicts: [],
        stats: {
          certainty100: 1,
          certainty50: 1,
          certainty0: 0,
          noUpdatesNeeded: 0,
        },
      });

      // Verify updates
      expect(report.updates).toHaveLength(2);
      expect(report.updates[0]).toMatchObject({
        profileId: 'uuid-1',
        certainty: 100,
        matchedBy: 'both',
        fieldsToUpdate: ['general_notes'],
      });
      expect(report.updates[1]).toMatchObject({
        profileId: 'uuid-2',
        certainty: 50,
        matchedBy: 'email',
        fieldsToUpdate: ['phone', 'full_name', 'general_notes'],
      });

      // Verify no SQL generated in dry-run
      expect(sqlStatements).toHaveLength(0);
    };

    await testMain();
  });

  it('should generate SQL in SQL generation mode', async () => {
    // Mock validated profiles file
    const validatedData = {
      valid: [
        {
          nome: 'Test User 1',
          email: 'test1@example.com',
          celular: '11999999999',
          observacao: 'New note',
        },
      ],
      errors: [],
      stats: { total: 1, valid: 1, invalid: 0, warnings: [] },
      eventColumns: [],
    };

    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(validatedData));

    // Mock database response
    const mockProfile: Insertable<Database['profiles']> = {
      id: 'uuid-1',
      email: 'test1@example.com',
      phone: 11999999999,
      full_name: 'Existing User',
      general_notes: null,
      created_at: new Date().toISOString(),
    };

    vi.mocked(db.execute).mockResolvedValueOnce([mockProfile]);

    // Import and run with SQL generation
    const module = await import('./generate-sql-existing-profiles');
    const { generateReport } = module as any;
    
    const { report, sqlStatements } = await generateReport(validatedData.valid, true);

    // Verify SQL was generated
    expect(sqlStatements).toHaveLength(1);
    expect(sqlStatements[0]).toContain('-- CERTAINTY: 100%');
    expect(sqlStatements[0]).toContain('UPDATE profiles');
    expect(sqlStatements[0]).toContain("general_notes = COALESCE(general_notes, 'New note')");
    expect(sqlStatements[0]).toContain("WHERE id = 'uuid-1'");
  });

  it('should handle conflicts correctly', async () => {
    // Mock validated profiles with conflict scenario
    const validatedData = {
      valid: [
        {
          nome: 'Conflict User',
          email: 'conflict@example.com',
          celular: '11777777777',
          observacao: 'Conflict note',
        },
      ],
      errors: [],
      stats: { total: 1, valid: 1, invalid: 0, warnings: [] },
      eventColumns: [],
    };

    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(validatedData));

    // Mock database response - two different profiles match different fields
    const mockProfiles: Array<Insertable<Database['profiles']>> = [
      {
        id: 'uuid-conflict-1',
        email: 'conflict@example.com',
        phone: null,
        full_name: 'User with Email',
        created_at: new Date().toISOString(),
      },
      {
        id: 'uuid-conflict-2',
        email: 'different@example.com',
        phone: 11777777777,
        full_name: 'User with Phone',
        created_at: new Date().toISOString(),
      },
    ];

    vi.mocked(db.execute).mockResolvedValueOnce(mockProfiles);

    // Import and run
    const module = await import('./generate-sql-existing-profiles');
    const { generateReport } = module as any;
    
    const { report, sqlStatements } = await generateReport(validatedData.valid, true);

    // Verify conflict was detected
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0]).toMatchObject({
      csvRow: 1,
      reason: expect.stringContaining('CONFLICT'),
      profiles: expect.arrayContaining([
        expect.objectContaining({ id: 'uuid-conflict-1' }),
        expect.objectContaining({ id: 'uuid-conflict-2' }),
      ]),
    });

    // Verify SQL for conflict contains comment only
    expect(sqlStatements).toHaveLength(1);
    expect(sqlStatements[0]).toContain('-- CERTAINTY: 0%');
    expect(sqlStatements[0]).toContain('-- ACTION: Skipped');
    expect(sqlStatements[0]).not.toContain('UPDATE profiles');
  });

  it('should save reports and logs correctly', async () => {
    const validatedData = {
      valid: [
        {
          nome: 'Test User',
          email: 'test@example.com',
          celular: '11999999999',
          observacao: 'Test note',
        },
      ],
      errors: [],
      stats: { total: 1, valid: 1, invalid: 0, warnings: [] },
      eventColumns: [],
    };

    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(validatedData));

    const mockProfile: Insertable<Database['profiles']> = {
      id: 'uuid-test',
      email: 'test@example.com',
      phone: 11999999999,
      full_name: 'Test User',
      general_notes: null,
      created_at: new Date().toISOString(),
    };

    vi.mocked(db.execute).mockResolvedValueOnce([mockProfile]);

    const module = await import('./generate-sql-existing-profiles');
    const { generateReport } = module as any;
    
    const { report, sqlStatements } = await generateReport(validatedData.valid, true);

    // Verify the report structure
    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      expect.stringContaining('sql-generation-report.json'),
      expect.any(String),
      'utf-8'
    );

    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      expect.stringContaining('match-decisions.log'),
      expect.any(String),
      'utf-8'
    );

    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      expect.stringContaining('update-existing-profiles.sql'),
      expect.stringContaining('-- SQL para atualizar perfis existentes'),
      'utf-8'
    );
  });
});