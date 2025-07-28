import { parse } from 'csv-parse';
import { readFile, writeFile } from 'fs/promises';
import { ProfileCSVRowSchema, normalizePhone } from './schemas/profile-csv.schema';

export interface ValidatedProfile {
  nome: string;
  nome_social?: string;
  genero?: string;
  orientacao?: string;
  pronomes?: string;
  email?: string;
  celular?: string;
  rg?: string;
  bandeira?: string;
  aprovado_futuras_festas?: string;
  observacao?: string;
  events: Record<string, boolean>;
}

export interface ValidationResult {
  valid: ValidatedProfile[];
  errors: Array<{
    row: number;
    data: Record<string, unknown>;
    errors: string[];
  }>;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    warnings: string[];
  };
  eventColumns: string[];
}

const knownColumns = [
  'nome',
  'nome_social',
  'genero',
  'orientacao',
  'pronomes',
  'email',
  'celular',
  'rg',
  'bandeira',
  'aprovado_futuras_festas',
  'observacao'
];

async function processRow(
  row: Record<string, string>,
  rowNumber: number,
  eventColumns: string[]
): Promise<{ profile?: ValidatedProfile; errors?: string[] }> {
  const knownFields: Record<string, unknown> = {};
  
  for (const col of knownColumns) {
    if (col in row) {
      let value = row[col];
      
      if (col === 'celular' && value) {
        value = normalizePhone(value) || '';
      }
      
      if (col === 'email' && value) {
        value = value.toLowerCase();
      }
      
      knownFields[col] = value;
    }
  }
  
  const validation = ProfileCSVRowSchema.safeParse(knownFields);
  
  if (!validation.success) {
    return {
      errors: validation.error.issues.map(issue => issue.message)
    };
  }
  
  const eventParticipations: Record<string, boolean> = {};
  for (const col of eventColumns) {
    const value = row[col];
    eventParticipations[col] = !!value && value.toLowerCase() !== 'não';
  }
  
  return {
    profile: {
      ...validation.data,
      events: eventParticipations
    }
  };
}

export async function validateCSV(filePath: string): Promise<ValidationResult> {
  const content = await readFile(filePath, 'utf-8');
  
  const records: Record<string, string>[] = await new Promise<Record<string, string>[]>((resolve, reject) => {
    parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }, (err, output: Record<string, string>[]) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
  
  if (records.length === 0) {
    return {
      valid: [],
      errors: [],
      stats: {
        total: 0,
        valid: 0,
        invalid: 0,
        warnings: ['No data found in CSV']
      },
      eventColumns: []
    };
  }
  
  const headers = Object.keys(records[0]);
  const eventColumns = headers.filter(h => !knownColumns.includes(h));
  
  const valid: ValidatedProfile[] = [];
  const errors: ValidationResult['errors'] = [];
  
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const result = await processRow(row, i + 1, eventColumns);
    
    if (result.profile) {
      valid.push(result.profile);
    } else if (result.errors) {
      errors.push({
        row: i + 1,
        data: row,
        errors: result.errors
      });
    }
  }
  
  const stats = {
    total: records.length,
    valid: valid.length,
    invalid: errors.length,
    warnings: [] as string[]
  };
  
  if (eventColumns.length === 0) {
    stats.warnings.push('No event columns detected');
  }
  
  return {
    valid,
    errors,
    stats,
    eventColumns
  };
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: tsx validate-profiles-csv.ts <csv-file>');
    process.exit(1);
  }
  
  const csvFile = args[0];
  
  try {
    console.info('📊 Validating CSV...');
    
    const result = await validateCSV(csvFile);
    
    console.info(`✅ ${result.stats.valid} perfis válidos`);
    console.info(`❌ ${result.stats.invalid} perfis com erros`);
    
    if (result.errors.length > 0) {
      console.info('\nErros encontrados:');
      result.errors.slice(0, 10).forEach(error => {
        console.info(`- Linha ${error.row}: ${error.errors.join(', ')}`);
      });
      
      if (result.errors.length > 10) {
        console.info(`... e mais ${result.errors.length - 10} erros`);
      }
    }
    
    console.info('\nEstatísticas:');
    console.info(`- Total de perfis: ${result.stats.total}`);
    
    const emailCount = result.valid.filter(p => p.email).length;
    const phoneCount = result.valid.filter(p => p.celular).length;
    const notesCount = result.valid.filter(p => p.observacao).length;
    
    console.info(`- Perfis com email: ${emailCount}`);
    console.info(`- Perfis com telefone: ${phoneCount}`);
    console.info(`- Perfis com observações: ${notesCount}`);
    
    console.info(`\nColunas de eventos detectadas: ${result.eventColumns.length}`);
    result.eventColumns.forEach(col => {
      console.info(`- "${col}"`);
    });
    
    const outputFile = 'validated-profiles.json';
    await writeFile(
      outputFile,
      JSON.stringify(result, null, 2),
      'utf-8'
    );
    
    console.info(`\nSalvando resultado em: ${outputFile}`);
  } catch (error) {
    console.error('Erro ao validar CSV:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}