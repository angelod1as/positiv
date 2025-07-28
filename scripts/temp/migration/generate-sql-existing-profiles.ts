#!/usr/bin/env tsx

import { Kysely, sql } from 'kysely';
import type { Database } from '~/types/database/kysely.types';
import type { Selectable } from 'kysely';
import { normalizePhone } from './schemas/profile-csv.schema';
import type { ValidatedProfile } from './validate-profiles-csv';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '~/lib/supabase/db.server';

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

  // Only add general_notes if it's currently null
  if (csvData.observacao && !profile.general_notes) {
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

interface MatchReport {
  mode: 'dry-run' | 'generate-sql';
  timestamp: string;
  totalProcessed: number;
  matched: {
    byEmail: number;
    byPhone: number;
    byBoth: number;
    total: number;
  };
  newProfiles: number;
  conflicts: Array<{
    csvRow: number;
    csvData: Partial<ValidatedProfile>;
    reason: string;
    profiles: Array<{ id: string; email?: string | null; phone?: number | null; full_name?: string | null }>;
  }>;
  updates: Array<{
    profileId: string;
    csvRow: number;
    matchedBy: 'email' | 'phone' | 'both';
    certainty: number;
    currentData: Partial<Profile>;
    newData: Partial<ValidatedProfile>;
    fieldsToUpdate: string[];
  }>;
  stats: {
    certainty100: number;
    certainty50: number;
    certainty0: number;
    noUpdatesNeeded: number;
  };
}

async function generateReport(
  validatedProfiles: ValidatedProfile[],
  generateSql: boolean
): Promise<{ report: MatchReport; sqlStatements: string[] }> {
  const service = new ProfileMatchingService(db);
  const report: MatchReport = {
    mode: generateSql ? 'generate-sql' : 'dry-run',
    timestamp: new Date().toISOString(),
    totalProcessed: validatedProfiles.length,
    matched: {
      byEmail: 0,
      byPhone: 0,
      byBoth: 0,
      total: 0,
    },
    newProfiles: 0,
    conflicts: [],
    updates: [],
    stats: {
      certainty100: 0,
      certainty50: 0,
      certainty0: 0,
      noUpdatesNeeded: 0,
    },
  };

  const sqlStatements: string[] = [];

  for (let i = 0; i < validatedProfiles.length; i++) {
    const csvProfile = validatedProfiles[i];
    const csvRow = i + 1;

    try {
      const matchResult = await service.findMatches(csvProfile);

      if (matchResult.profiles.length === 0) {
        report.newProfiles++;
        continue;
      }

      // Update match statistics
      if (matchResult.matchType === 'email_and_phone') {
        report.matched.byBoth++;
        report.matched.total++;
      } else if (matchResult.matchType === 'email_only') {
        report.matched.byEmail++;
        report.matched.total++;
      } else if (matchResult.matchType === 'phone_only') {
        report.matched.byPhone++;
        report.matched.total++;
      }

      // Update certainty statistics
      if (matchResult.certainty === 100) {
        report.stats.certainty100++;
      } else if (matchResult.certainty === 50) {
        report.stats.certainty50++;
      } else {
        report.stats.certainty0++;
      }

      // Handle conflicts
      if (matchResult.certainty === 0) {
        report.conflicts.push({
          csvRow,
          csvData: {
            nome: csvProfile.nome,
            email: csvProfile.email,
            celular: csvProfile.celular,
          },
          reason: matchResult.reason,
          profiles: matchResult.profiles.map(p => ({
            id: p.id,
            email: p.email,
            phone: p.phone,
            full_name: p.full_name,
          })),
        });

        if (generateSql) {
          const conflictSql = generateUpdateSQL(matchResult.profiles[0], csvProfile, matchResult);
          sqlStatements.push(conflictSql);
        }
        continue;
      }

      // Process updates for 50% and 100% certainty matches
      const profile = matchResult.profiles[0];
      const fieldsToUpdate: string[] = [];

      // Check which fields would be updated
      if (csvProfile.celular && !profile.phone) {
        fieldsToUpdate.push('phone');
      }
      if (csvProfile.nome && !profile.full_name) {
        fieldsToUpdate.push('full_name');
      }
      if (csvProfile.nome_social && !profile.social_name) {
        fieldsToUpdate.push('social_name');
      }
      if (csvProfile.observacao && !profile.general_notes) {
        fieldsToUpdate.push('general_notes');
      }

      if (fieldsToUpdate.length === 0) {
        report.stats.noUpdatesNeeded++;
      } else {
        report.updates.push({
          profileId: profile.id,
          csvRow,
          matchedBy: matchResult.matchType === 'email_and_phone' ? 'both' :
                     matchResult.matchType === 'email_only' ? 'email' : 'phone',
          certainty: matchResult.certainty,
          currentData: {
            email: profile.email,
            phone: profile.phone,
            full_name: profile.full_name,
            social_name: profile.social_name,
            general_notes: profile.general_notes,
          },
          newData: {
            nome: csvProfile.nome,
            nome_social: csvProfile.nome_social,
            email: csvProfile.email,
            celular: csvProfile.celular,
            observacao: csvProfile.observacao,
          },
          fieldsToUpdate,
        });
      }

      if (generateSql) {
        const updateSql = generateUpdateSQL(profile, csvProfile, matchResult);
        sqlStatements.push(updateSql);
      }
    } catch (error) {
      console.error(`Error processing row ${csvRow}:`, error);
      report.conflicts.push({
        csvRow,
        csvData: {
          nome: csvProfile.nome,
          email: csvProfile.email,
          celular: csvProfile.celular,
        },
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        profiles: [],
      });
    }
  }

  return { report, sqlStatements };
}

function printReport(report: MatchReport) {
  console.info(`\n🔍 ${report.mode === 'dry-run' ? 'MODO DRY-RUN' : 'MODO SQL'} - Analisando perfis...`);
  console.info(`✅ ${report.matched.total} matches encontrados`);
  console.info(`  - ${report.matched.byBoth} com email E telefone (100% certeza)`);
  console.info(`  - ${report.matched.byEmail} apenas por email (50% certeza)`);
  console.info(`  - ${report.matched.byPhone} apenas por telefone (50% certeza)`);
  console.info(`⚠️  ${report.conflicts.length} conflitos detectados`);
  console.info(`🆕 ${report.newProfiles} perfis novos (serão criados em outra task)`);

  console.info('\nRESUMO DE ATUALIZAÇÕES:');
  const updatesByFields = report.updates.reduce((acc, update) => {
    const key = update.fieldsToUpdate.sort().join(' + ');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(updatesByFields).forEach(([fields, count]) => {
    console.info(`- ${count} perfis: adicionar ${fields}`);
  });

  if (report.stats.noUpdatesNeeded > 0) {
    console.info(`- ${report.stats.noUpdatesNeeded} perfis: nenhuma atualização necessária`);
  }

  if (report.conflicts.length > 0) {
    console.info('\nCONFLITOS ENCONTRADOS:');
    report.conflicts.slice(0, 5).forEach((conflict, index) => {
      console.info(`\n${index + 1}. Row ${conflict.csvRow} (${conflict.csvData.email || 'sem email'}):`);
      console.info(`   Razão: ${conflict.reason}`);
      conflict.profiles.forEach((p, i) => {
        const hasUserId = p.id.includes('user_id');
        console.info(`   - Profile ${i + 1}: ${p.id} (email: ${p.email || 'null'}, phone: ${p.phone || 'null'})${hasUserId ? ' ✓ tem user_id' : ''}`);
      });
    });

    if (report.conflicts.length > 5) {
      console.info(`\n... e mais ${report.conflicts.length - 5} conflitos`);
    }
  }

  console.info(`\nESTATÍSTICAS DE CERTEZA:`);
  console.info(`- 100% certeza: ${report.stats.certainty100} perfis`);
  console.info(`- 50% certeza: ${report.stats.certainty50} perfis`);
  console.info(`- 0% certeza (conflitos): ${report.stats.certainty0} perfis`);
}

// Main function for CLI usage
async function main() {
  const args = process.argv.slice(2);
  const generateSql = args.includes('--generate-sql');
  
  try {
    // Load validated profiles from the previous step
    const validatedFile = join(process.cwd(), 'validated-profiles.json');
    const validatedContent = await readFile(validatedFile, 'utf-8');
    const validationResult = JSON.parse(validatedContent);

    if (!validationResult.valid || validationResult.valid.length === 0) {
      console.error('❌ Nenhum perfil válido encontrado em validated-profiles.json');
      console.error('Execute primeiro: pnpm migration:validate <csv-file>');
      process.exit(1);
    }

    console.info(`📊 Processando ${validationResult.valid.length} perfis validados...`);

    const { report, sqlStatements } = await generateReport(validationResult.valid, generateSql);

    // Print report
    printReport(report);

    // Save report
    const reportFile = generateSql ? 'sql-generation-report.json' : 'dry-run-report.json';
    await writeFile(
      join(process.cwd(), 'scripts/temp/migration', reportFile),
      JSON.stringify(report, null, 2),
      'utf-8'
    );
    console.info(`\nRelatório completo em: scripts/temp/migration/${reportFile}`);

    // Save SQL if requested
    if (generateSql && sqlStatements.length > 0) {
      const sqlFile = join(process.cwd(), 'scripts/temp/migration', 'update-existing-profiles.sql');
      const sqlContent = [
        '-- SQL para atualizar perfis existentes',
        `-- Gerado em: ${new Date().toISOString()}`,
        `-- Total de statements: ${sqlStatements.length}`,
        '',
        ...sqlStatements,
      ].join('\n');

      await writeFile(sqlFile, sqlContent, 'utf-8');
      console.info(`\n📝 SQL gerado em: scripts/temp/migration/update-existing-profiles.sql`);
    } else if (!generateSql) {
      console.info('\nPara gerar SQL, execute com --generate-sql');
    }

    // Save match decisions log
    const decisionsLog = report.updates.map(update => ({
      row: update.csvRow,
      profileId: update.profileId,
      certainty: update.certainty,
      matchedBy: update.matchedBy,
      fieldsToUpdate: update.fieldsToUpdate,
    }));

    await writeFile(
      join(process.cwd(), 'scripts/temp/migration', 'match-decisions.log'),
      JSON.stringify(decisionsLog, null, 2),
      'utf-8'
    );

  } catch (error) {
    console.error('❌ Erro ao processar perfis:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}