#!/usr/bin/env tsx

import { Kysely, sql } from 'kysely';
import type { Database } from '~/types/database/kysely.types';
import type { Selectable } from 'kysely';
import { normalizePhone } from './schemas/profile-csv.schema';
import type { ValidatedProfile } from './validate-profiles-csv';

type Profile = Selectable<Database['profiles']>;

export interface MatchResult {
  certainty: 100 | 50 | 0;
  profiles: Profile[];
  matchType: 'email_and_phone' | 'email_only' | 'phone_only' | 'conflict';
  reason: string;
}

export class ProfileMatchingService {
  constructor(private db: Kysely<Database>) {}

  async findMatches(csvProfile: Partial<ValidatedProfile>): Promise<MatchResult> {
    const normalizedPhone = csvProfile.celular ? normalizePhone(csvProfile.celular) : null;
    const phoneNumber = normalizedPhone ? parseInt(normalizedPhone, 10) : null;

    // Find all profiles that match either email or phone
    let query = this.db
      .selectFrom('profiles')
      .select([
        'id',
        'email',
        'phone',
        'full_name',
        'social_name',
        'general_notes',
        'user_id',
        'created_at',
        'date_of_birth',
        'gender',
        'orientation',
        'pronouns',
        'cpf',
        'rg',
        'rg_issuer',
        'allow_marketing_email',
        'approved_to_attend',
        'basic_data_filled',
        'flag',
        'flag_notes',
        'how_came_to_us',
        'where_lives',
        'is_veteran'
      ]);

    // Build WHERE clause for email OR phone
    const conditions: any[] = [];
    if (csvProfile.email) {
      conditions.push(sql`email = ${csvProfile.email.toLowerCase()}`);
    }
    if (phoneNumber) {
      conditions.push(sql`phone = ${phoneNumber}`);
    }

    if (conditions.length === 0) {
      return {
        certainty: 0,
        profiles: [],
        matchType: 'conflict',
        reason: 'No email or phone provided in CSV'
      };
    }

    query = query.where(sql`${sql.join(conditions, sql` OR `)}`);
    
    const profiles = await query.execute();

    // Analyze matches
    if (profiles.length === 0) {
      return {
        certainty: 0,
        profiles: [],
        matchType: 'conflict',
        reason: 'No matching profiles found'
      };
    }

    // Check for 100% certainty - single profile with both email AND phone matching
    if (profiles.length === 1 && csvProfile.email && phoneNumber) {
      const profile = profiles[0];
      if (
        profile.email?.toLowerCase() === csvProfile.email.toLowerCase() &&
        profile.phone === phoneNumber
      ) {
        return {
          certainty: 100,
          profiles: [profile],
          matchType: 'email_and_phone',
          reason: 'Matched by both email AND phone'
        };
      }
    }

    // Check for 50% certainty - single profile with either email OR phone matching
    if (profiles.length === 1) {
      const profile = profiles[0];
      const emailMatch = csvProfile.email && profile.email?.toLowerCase() === csvProfile.email.toLowerCase();
      const phoneMatch = phoneNumber && profile.phone === phoneNumber;

      if (emailMatch && !phoneMatch) {
        return {
          certainty: 50,
          profiles: [profile],
          matchType: 'email_only',
          reason: `Matched by email only (phone ${profile.phone ? 'differs' : 'was null'})`
        };
      }

      if (phoneMatch && !emailMatch) {
        return {
          certainty: 50,
          profiles: [profile],
          matchType: 'phone_only',
          reason: `Matched by phone only (email ${profile.email ? 'differs' : 'was null'})`
        };
      }
    }

    // Check for conflicts - multiple profiles or mismatched data
    if (profiles.length > 1) {
      // Check if all profiles have the same email AND phone
      const allSameEmailAndPhone = profiles.every(p => 
        p.email?.toLowerCase() === csvProfile.email?.toLowerCase() &&
        p.phone === phoneNumber
      );

      if (allSameEmailAndPhone) {
        return {
          certainty: 0,
          profiles,
          matchType: 'conflict',
          reason: `Multiple profiles (${profiles.length}) with same email and phone - requires manual review`
        };
      }

      // Check if different profiles match different fields
      const emailMatches = profiles.filter(p => p.email?.toLowerCase() === csvProfile.email?.toLowerCase());
      const phoneMatches = profiles.filter(p => p.phone === phoneNumber);

      if (emailMatches.length > 0 && phoneMatches.length > 0) {
        const emailOnlyProfiles = emailMatches.filter(p => p.phone !== phoneNumber);
        const phoneOnlyProfiles = phoneMatches.filter(p => p.email?.toLowerCase() !== csvProfile.email?.toLowerCase());

        if (emailOnlyProfiles.length > 0 && phoneOnlyProfiles.length > 0) {
          return {
            certainty: 0,
            profiles,
            matchType: 'conflict',
            reason: `CONFLICT: Different profiles match different fields from CSV (email: ${csvProfile.email}, phone: ${csvProfile.celular})`
          };
        }
      }

      return {
        certainty: 0,
        profiles,
        matchType: 'conflict',
        reason: `Multiple profiles found (${profiles.length}) - requires manual review`
      };
    }

    // Default case - should not reach here
    return {
      certainty: 0,
      profiles,
      matchType: 'conflict',
      reason: 'Unexpected matching scenario'
    };
  }
}

export function generateUpdateSQL(
  profile: Profile,
  csvData: Partial<ValidatedProfile>,
  matchResult: MatchResult
): string {
  const lines: string[] = [];

  // Add certainty comment
  lines.push(`-- CERTAINTY: ${matchResult.certainty}% - ${matchResult.reason}`);
  
  if (matchResult.certainty === 0) {
    lines.push(`-- CSV Data: ${JSON.stringify({ email: csvData.email, phone: csvData.celular, name: csvData.nome })}`);
    lines.push(`-- Found profiles:`);
    matchResult.profiles.forEach(p => {
      lines.push(`--   - ID: ${p.id}, Email: ${p.email || 'null'}, Phone: ${p.phone || 'null'}, Name: ${p.full_name || 'null'}`);
    });
    lines.push(`-- ACTION: Skipped - requires manual review`);
    lines.push('');
    return lines.join('\n');
  }

  // Generate UPDATE statement
  lines.push(`-- Profile ID: ${profile.id}`);
  lines.push(`-- Current: Email: ${profile.email}, Phone: ${profile.phone || 'null'}, Name: ${profile.full_name || 'null'}`);
  lines.push(`-- CSV: Email: ${csvData.email || 'null'}, Phone: ${csvData.celular || 'null'}, Name: ${csvData.nome || 'null'}`);
  
  const updates: string[] = [];

  // Add phone if missing
  if (csvData.celular && !profile.phone) {
    const normalizedPhone = normalizePhone(csvData.celular);
    if (normalizedPhone) {
      updates.push(`  phone = COALESCE(phone, ${parseInt(normalizedPhone, 10)})`);
    }
  }

  // Add full_name if missing
  if (csvData.nome && !profile.full_name) {
    updates.push(`  full_name = COALESCE(full_name, '${csvData.nome.replace(/'/g, "''")}')`);
  }

  // Add social_name if missing
  if (csvData.nome_social && !profile.social_name) {
    updates.push(`  social_name = COALESCE(social_name, '${csvData.nome_social.replace(/'/g, "''")}')`);
  }

  // Always try to add general_notes
  if (csvData.observacao) {
    updates.push(`  general_notes = COALESCE(general_notes, '${csvData.observacao.replace(/'/g, "''")}')`);
  }

  if (updates.length === 0) {
    lines.push('-- No updates needed - all fields already populated');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('UPDATE profiles');
  lines.push('SET');
  lines.push(updates.join(',\n') + ',');
  lines.push('  updated_at = NOW()');
  lines.push(`WHERE id = '${profile.id}'`);
  lines.push('AND (');
  
  // Add conditions to ensure we only update if fields are actually null
  const conditions: string[] = [];
  if (csvData.celular && !profile.phone) conditions.push('  phone IS NULL');
  if (csvData.nome && !profile.full_name) conditions.push('  full_name IS NULL');
  if (csvData.nome_social && !profile.social_name) conditions.push('  social_name IS NULL');
  if (csvData.observacao) conditions.push('  general_notes IS NULL');
  
  lines.push(conditions.join(' OR\n'));
  lines.push(');');
  lines.push('');

  return lines.join('\n');
}

// Main function for CLI usage
async function main() {
  console.log('generate-sql-existing-profiles.ts - Not implemented yet');
  console.log('This will be implemented after tests pass');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}