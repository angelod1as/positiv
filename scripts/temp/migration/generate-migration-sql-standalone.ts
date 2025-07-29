#!/usr/bin/env tsx
import { parse } from 'csv-parse';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import {
  getFlag,
  getApprovedStatus,
  getGender,
  getOrientation,
  normalizePhone,
  normalizeRG,
} from './mappings/enum-mappings';
import { escapeSQL, formatSQLValue } from './utils/sql-escape';

interface CSVRow {
  Nome: string;
  'Nome social'?: string;
  'Gênero'?: string;
  'Orientação'?: string;
  'Pronomes'?: string;
  'E-mail'?: string;
  'Celular'?: string;
  'RG'?: string;
  'Bandeira'?: string;
  'Aprovade para futuras festas?'?: string;
  'Observação'?: string;
  [key: string]: string | undefined; // For event columns
}

interface ProcessedProfile {
  csvRow: number;
  csvData: CSVRow;
  mappedData: {
    full_name: string;
    social_name?: string;
    gender?: string;
    orientation?: string;
    pronouns?: string;
    email?: string;
    phone?: string;
    rg?: string;
    approved_to_attend: string;
    flag: string;
    general_notes?: string;
  };
  events: Record<string, boolean>;
}

interface MigrationReport {
  summary: {
    totalCSVRows: number;
    totalProfiles: number;
    totalParticipations: number;
    duplicatesInCSV: number;
  };
  duplicatesInCSV: Array<{
    field: 'email' | 'phone';
    value: string;
    rows: number[];
    decision: string;
  }>;
  unmappedGenders: Array<{ value: string; count: number }>;
  unmappedOrientations: Array<{ value: string; count: number }>;
  unmappedEvents: Array<{ column: string; count: number }>;
  flagDistribution: {
    red: number;
    yellow: number;
    none: number;
  };
  approvalDistribution: {
    approved: number;
    rejected: number;
    pending: number;
    approved_with_reservations: number;
  };
}

const knownColumns = new Set([
  'Nome',
  'Nome social',
  'Gênero',
  'Orientação',
  'Pronomes',
  'E-mail',
  'Celular',
  'RG',
  'Bandeira',
  'Aprovade para futuras festas?',
  'Convidade a gravar número Positiv',
  'Observação',
]);

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const content = await readFile(filePath, 'utf-8');
  
  return new Promise((resolve, reject) => {
    parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }, (err, output: CSVRow[]) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}

function processEventColumns(row: CSVRow, eventColumns: string[]): Record<string, boolean> {
  const events: Record<string, boolean> = {};
  
  for (const col of eventColumns) {
    const value = row[col];
    // Consider participated if field has any value except empty, 'não', or 'FALSE'
    events[col] = !!(value && value.toLowerCase() !== 'não' && value !== 'FALSE');
  }
  
  return events;
}

function detectDuplicatesInCSV(rows: CSVRow[]): MigrationReport['duplicatesInCSV'] {
  const emailMap = new Map<string, number[]>();
  const phoneMap = new Map<string, number[]>();
  const duplicates: MigrationReport['duplicatesInCSV'] = [];
  
  rows.forEach((row, index) => {
    const email = row['E-mail']?.toLowerCase();
    const phone = normalizePhone(row['Celular']);
    
    if (email) {
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email)?.push(index + 1);
    }
    
    if (phone) {
      if (!phoneMap.has(phone)) phoneMap.set(phone, []);
      phoneMap.get(phone)?.push(index + 1);
    }
  });
  
  for (const [email, rowNumbers] of emailMap) {
    if (rowNumbers.length > 1) {
      duplicates.push({
        field: 'email',
        value: email,
        rows: rowNumbers,
        decision: 'Using first occurrence',
      });
    }
  }
  
  for (const [phone, rowNumbers] of phoneMap) {
    if (rowNumbers.length > 1) {
      duplicates.push({
        field: 'phone',
        value: phone,
        rows: rowNumbers,
        decision: 'Using first occurrence',
      });
    }
  }
  
  return duplicates;
}

async function processProfiles(rows: CSVRow[], eventColumns: string[]): Promise<{
  profiles: ProcessedProfile[];
  report: MigrationReport;
}> {
  const profiles: ProcessedProfile[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const unmappedGenders = new Map<string, number>();
  const unmappedOrientations = new Map<string, number>();
  const flagCounts = { red: 0, yellow: 0, none: 0 };
  const approvalCounts = { 
    approved: 0, 
    rejected: 0, 
    pending: 0, 
    approved_with_reservations: 0 
  };
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = row['E-mail']?.toLowerCase();
    const phone = normalizePhone(row['Celular']);
    
    // Skip if duplicate in CSV (use first occurrence)
    if (email && seenEmails.has(email)) continue;
    if (phone && seenPhones.has(phone)) continue;
    
    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    
    // Skip if no name
    if (!row.Nome || row.Nome.trim() === '') continue;
    
    // Map gender and orientation
    const mappedGender = getGender(row['Gênero']);
    const mappedOrientation = getOrientation(row['Orientação']);
    
    // Track unmapped values
    if (row['Gênero'] && mappedGender === row['Gênero'] && !['Mulher cis', 'Mulher trans', 'Travesti', 'Pessoa não binária', 'Pessoa agênera', 'Homem trans', 'Homem cis'].includes(mappedGender)) {
      unmappedGenders.set(mappedGender, (unmappedGenders.get(mappedGender) || 0) + 1);
    }
    
    if (row['Orientação'] && mappedOrientation === row['Orientação'] && !['Hétero', 'Gay', 'Sapatão', 'Bi', 'Pan', 'Demi', 'Ace'].includes(mappedOrientation)) {
      unmappedOrientations.set(mappedOrientation, (unmappedOrientations.get(mappedOrientation) || 0) + 1);
    }
    
    // Map flag and approval status
    const flag = getFlag(row['Bandeira']);
    const approvedStatus = getApprovedStatus(row['Aprovade para futuras festas?']);
    
    // Count flags and approvals
    flagCounts[flag]++;
    approvalCounts[approvedStatus as keyof typeof approvalCounts]++;
    
    const processedProfile: ProcessedProfile = {
      csvRow: i + 1,
      csvData: row,
      mappedData: {
        full_name: row.Nome.trim(),
        social_name: row['Nome social']?.trim() || undefined,
        gender: mappedGender || undefined,
        orientation: mappedOrientation || undefined,
        pronouns: row['Pronomes']?.trim() || undefined,
        email: email || undefined,
        phone: phone || undefined,
        rg: normalizeRG(row['RG']) || undefined,
        approved_to_attend: approvedStatus,
        flag: flag,
        general_notes: row['Observação']?.trim() || undefined,
      },
      events: processEventColumns(row, eventColumns),
    };
    
    profiles.push(processedProfile);
  }
  
  const duplicatesInCSV = detectDuplicatesInCSV(rows);
  
  const report: MigrationReport = {
    summary: {
      totalCSVRows: rows.length,
      totalProfiles: profiles.length,
      totalParticipations: profiles.reduce((sum, p) => 
        sum + Object.values(p.events).filter(Boolean).length, 0
      ),
      duplicatesInCSV: duplicatesInCSV.length,
    },
    duplicatesInCSV,
    unmappedGenders: Array.from(unmappedGenders.entries()).map(([value, count]) => ({ value, count })),
    unmappedOrientations: Array.from(unmappedOrientations.entries()).map(([value, count]) => ({ value, count })),
    unmappedEvents: [], // Will be populated later
    flagDistribution: flagCounts,
    approvalDistribution: approvalCounts,
  };
  
  return { profiles, report };
}

function generateNewProfilesSQL(profiles: ProcessedProfile[]): string {
  if (profiles.length === 0) {
    return '-- No profiles to insert\n';
  }
  
  let sql = 'BEGIN;\n\n';
  sql += '-- Insert new orphan profiles (without user_id)\n';
  sql += `-- Total: ${profiles.length} profiles\n`;
  sql += '-- Note: This assumes ALL profiles are new (no database matching performed)\n\n';
  
  for (const profile of profiles) {
    const { mappedData, csvRow, csvData } = profile;
    
    sql += `-- Profile ${csvRow}: ${mappedData.full_name}`;
    if (mappedData.email) sql += ` | ${mappedData.email}`;
    if (mappedData.phone) sql += ` | ${mappedData.phone}`;
    sql += '\n';
    
    if (csvData['Bandeira']) {
      sql += `-- Original flag value: "${csvData['Bandeira']}" -> ${mappedData.flag}\n`;
    }
    
    sql += 'INSERT INTO profiles (\n';
    sql += '  id, user_id, full_name, social_name, gender, orientation,\n';
    sql += '  pronouns, email, phone, rg, approved_to_attend,\n';
    sql += '  flag, general_notes, created_at, updated_at\n';
    sql += ') VALUES (\n';
    sql += '  gen_random_uuid(),\n';
    sql += '  NULL, -- Orphan profile\n';
    sql += `  ${formatSQLValue(mappedData.full_name)},\n`;
    sql += `  ${formatSQLValue(mappedData.social_name)},\n`;
    sql += `  ${formatSQLValue(mappedData.gender)},\n`;
    sql += `  ${formatSQLValue(mappedData.orientation)},\n`;
    sql += `  ${formatSQLValue(mappedData.pronouns)},\n`;
    sql += `  ${formatSQLValue(mappedData.email)},\n`;
    sql += `  ${formatSQLValue(mappedData.phone)},\n`;
    sql += `  ${formatSQLValue(mappedData.rg)},\n`;
    sql += `  '${escapeSQL(mappedData.approved_to_attend)}',\n`;
    sql += `  '${escapeSQL(mappedData.flag)}',\n`;
    sql += `  ${formatSQLValue(mappedData.general_notes)},\n`;
    sql += '  NOW(),\n';
    sql += '  NOW()\n';
    sql += ');\n\n';
  }
  
  sql += '-- Verification query\n';
  sql += 'SELECT COUNT(*) as new_orphan_profiles\n';
  sql += 'FROM profiles\n';
  sql += 'WHERE user_id IS NULL\n';
  sql += "AND created_at >= NOW() - INTERVAL '1 minute';\n\n";
  
  sql += 'COMMIT;\n';
  
  return sql;
}

function generateEventParticipantsSQL(profiles: ProcessedProfile[], eventMapping: Record<string, string>): string {
  let sql = 'BEGIN;\n\n';
  sql += '-- Insert event participations\n';
  sql += '-- Note: This uses a placeholder profile lookup since we don\'t have profile IDs\n';
  sql += '-- In production, you\'ll need to run this after profiles are created\n\n';
  
  let participationCount = 0;
  
  for (const profile of profiles) {
    for (const [eventColumn, participated] of Object.entries(profile.events)) {
      if (!participated) continue;
      
      const eventId = eventMapping[eventColumn];
      if (!eventId) continue;
      
      participationCount++;
      
      sql += `-- Participation for profile (row ${profile.csvRow}) in event "${eventColumn}"\n`;
      sql += '-- This assumes the profile was created with the same email/phone\n';
      sql += 'INSERT INTO event_participants (\n';
      sql += '  id, event_id, profile_id, status, attendance_confirmed,\n';
      sql += '  created_at, updated_at\n';
      sql += ') VALUES (\n';
      sql += '  gen_random_uuid(),\n';
      sql += `  '${escapeSQL(eventId)}',\n`;
      sql += '  (SELECT id FROM profiles WHERE\n';
      
      const conditions = [];
      if (profile.mappedData.email) {
        conditions.push(`    email = ${formatSQLValue(profile.mappedData.email)}`);
      }
      if (profile.mappedData.phone) {
        conditions.push(`    phone = ${formatSQLValue(profile.mappedData.phone)}`);
      }
      if (conditions.length === 0) {
        // Use name as fallback
        conditions.push(`    full_name = ${formatSQLValue(profile.mappedData.full_name)}`);
      }
      sql += conditions.join(' OR\n') + '\n';
      sql += '    LIMIT 1),\n';
      sql += "  'confirmed',\n";
      sql += '  true,\n';
      sql += '  NOW(),\n';
      sql += '  NOW()\n';
      sql += ') ON CONFLICT (event_id, profile_id) DO NOTHING;\n\n';
    }
  }
  
  if (participationCount === 0) {
    sql = '-- No event participations to insert (no event mapping available)\n';
  } else {
    sql += '-- Verification query\n';
    sql += 'SELECT COUNT(*) as total_participations\n';
    sql += 'FROM event_participants\n';
    sql += "WHERE created_at >= NOW() - INTERVAL '1 minute';\n\n";
    
    sql += 'COMMIT;\n';
  }
  
  return sql;
}

async function loadEventMapping(): Promise<Record<string, string>> {
  // Try to load event mapping from file if it exists
  const mappingPath = join(process.cwd(), 'scripts/temp/migration/output/event-mapping.json');
  
  if (existsSync(mappingPath)) {
    const content = await readFile(mappingPath, 'utf-8');
    return JSON.parse(content);
  }
  
  // Return empty mapping if file doesn't exist
  console.warn('⚠️  Event mapping file not found. Event participations will not be generated.');
  console.warn('   Run generate-event-mapping.ts first to map CSV columns to events.');
  return {};
}

async function main() {
  const args = process.argv.slice(2);
  // Default to mailing.csv in positiv-project root
  let csvPath = join(process.cwd(), '../../../../mailing.csv');
  let generateSQL = false;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && i + 1 < args.length) {
      csvPath = args[i + 1];
      i++;
    } else if (args[i] === '--generate-sql') {
      generateSQL = true;
    }
  }
  
  console.info('🚀 Positiv Profile Migration SQL Generator (Standalone)');
  console.info('=======================================================');
  console.info(`CSV File: ${csvPath}`);
  console.info(`Mode: ${generateSQL ? 'Generate SQL' : 'Dry Run (Analysis Only)'}`);
  console.info('Note: Running without database connection - assumes ALL profiles are new');
  console.info('');
  
  try {
    // Parse CSV
    console.info('📖 Reading CSV file...');
    const rows = await parseCSV(csvPath);
    console.info(`✅ Found ${rows.length} rows`);
    
    // Detect event columns
    const allColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const eventColumns = allColumns.filter(col => !knownColumns.has(col));
    console.info(`📅 Detected ${eventColumns.length} event columns`);
    
    // Load event mapping
    const eventMapping = await loadEventMapping();
    const mappedEventCount = eventColumns.filter(col => eventMapping[col]).length;
    console.info(`🔗 Mapped ${mappedEventCount}/${eventColumns.length} events to database`);
    
    // Process profiles
    console.info('\n🔄 Processing profiles...');
    const { profiles, report } = await processProfiles(rows, eventColumns);
    
    // Update unmapped events in report
    report.unmappedEvents = eventColumns
      .filter(col => !eventMapping[col])
      .map(col => ({
        column: col,
        count: profiles.filter(p => p.events[col]).length,
      }));
    
    // Display report
    console.info('\n📊 Migration Analysis Report');
    console.info('============================');
    console.info(`Total CSV Rows: ${report.summary.totalCSVRows}`);
    console.info(`Total Profiles to Process: ${report.summary.totalProfiles}`);
    console.info(`Total Event Participations: ${report.summary.totalParticipations}`);
    console.info(`Duplicates in CSV: ${report.summary.duplicatesInCSV}`);
    
    if (report.duplicatesInCSV.length > 0) {
      console.info('\n⚠️  Duplicates Found in CSV:');
      report.duplicatesInCSV.slice(0, 5).forEach(dup => {
        console.info(`  - ${dup.field}: ${dup.value} (rows: ${dup.rows.join(', ')})`);
        console.info(`    Decision: ${dup.decision}`);
      });
      if (report.duplicatesInCSV.length > 5) {
        console.info(`  ... and ${report.duplicatesInCSV.length - 5} more`);
      }
    }
    
    console.info('\n🚩 Flag Distribution:');
    console.info(`  🔴 Red: ${report.flagDistribution.red}`);
    console.info(`  🟡 Yellow: ${report.flagDistribution.yellow}`);
    console.info(`  ⚪ None: ${report.flagDistribution.none}`);
    
    console.info('\n✅ Approval Status Distribution:');
    console.info(`  ✅ Approved: ${report.approvalDistribution.approved}`);
    console.info(`  ❌ Rejected: ${report.approvalDistribution.rejected}`);
    console.info(`  ⏳ Pending: ${report.approvalDistribution.pending}`);
    console.info(`  ⚠️  With Reservations: ${report.approvalDistribution.approved_with_reservations}`);
    
    if (report.unmappedGenders.length > 0) {
      console.info('\n❓ Unmapped Gender Values:');
      report.unmappedGenders.forEach(({ value, count }) => {
        console.info(`  - "${value}": ${count} occurrences`);
      });
    }
    
    if (report.unmappedOrientations.length > 0) {
      console.info('\n❓ Unmapped Orientation Values:');
      report.unmappedOrientations.forEach(({ value, count }) => {
        console.info(`  - "${value}": ${count} occurrences`);
      });
    }
    
    if (report.unmappedEvents.length > 0) {
      console.info('\n📅 Unmapped Event Columns:');
      report.unmappedEvents.slice(0, 10).forEach(({ column, count }) => {
        console.info(`  - "${column}": ${count} participants`);
      });
      if (report.unmappedEvents.length > 10) {
        console.info(`  ... and ${report.unmappedEvents.length - 10} more`);
      }
    }
    
    // Save report
    const outputDir = join(process.cwd(), 'scripts/temp/migration/output');
    await mkdir(outputDir, { recursive: true });
    
    const reportPath = join(outputDir, 'migration-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.info(`\n📄 Report saved to: ${reportPath}`);
    
    // Generate SQL if requested
    if (generateSQL) {
      console.info('\n🔨 Generating SQL files...');
      
      // Generate new profiles SQL
      const newProfilesSQL = generateNewProfilesSQL(profiles);
      const newProfilesPath = join(outputDir, 'insert-new-profiles.sql');
      await writeFile(newProfilesPath, newProfilesSQL);
      console.info(`✅ Generated: ${newProfilesPath}`);
      
      // Generate event participants SQL
      const participantsSQL = generateEventParticipantsSQL(profiles, eventMapping);
      const participantsPath = join(outputDir, 'insert-event-participants.sql');
      await writeFile(participantsPath, participantsSQL);
      console.info(`✅ Generated: ${participantsPath}`);
      
      console.info('\n✨ SQL generation complete!');
      console.info('\n⚠️  IMPORTANT:');
      console.info('- This script assumed ALL profiles are new (no database matching)');
      console.info('- Review the SQL carefully before running in production');
      console.info('- Consider running POS-174 first to identify existing profiles');
    } else {
      console.info('\n💡 This was a dry run. To generate SQL files, run with --generate-sql');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}