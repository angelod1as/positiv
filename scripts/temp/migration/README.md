# Migration Scripts

This directory contains temporary migration scripts for one-time data operations.

## Profile Migration Workflow

### 1. Validate CSV File
```bash
pnpm migration:validate <csv-file>
```
Validates the CSV file and generates `validated-profiles.json` with clean data.

### 2. Generate SQL for Existing Profiles
```bash
# Dry run - analyze matches and generate report
pnpm migration:generate-sql

# Generate SQL file
pnpm migration:generate-sql --generate-sql
```

This script:
- Finds existing profiles by email OR phone
- Calculates certainty levels:
  - **100% certainty**: Both email AND phone match
  - **50% certainty**: Only email OR phone matches
  - **0% certainty**: Different profiles match different fields (conflicts)
- Generates UPDATE statements only for fields that are NULL
- Creates detailed reports and logs

Output files:
- `dry-run-report.json` - Analysis report (dry-run mode)
- `sql-generation-report.json` - Full report (SQL mode)
- `update-existing-profiles.sql` - SQL statements
- `match-decisions.log` - Matching decisions log

## Event Mapping Generation

```bash
pnpm migration:event-mapping
```

Script interativo para mapear colunas de CSV para IDs de eventos no banco de dados.

### Funcionalidades

- 🔍 Busca automática de eventos por data e nome
- 💾 Salvamento de progresso (pode continuar de onde parou)
- 🎯 Interface interativa para confirmar/selecionar mapeamentos
- 📝 Geração de arquivo TypeScript com os mapeamentos

### Fluxo

1. O script busca todos os eventos do banco
2. Para cada coluna do CSV:
   - Tenta encontrar matches automáticos (por data/nome)
   - Apresenta opções ao usuário
   - Salva o mapeamento escolhido
3. Gera arquivo final `event-mapping.ts`

## Production Database Sync

```bash
# Dry run - shows what would be done
pnpm db:sync:prod:dry-run

# Execute sync
pnpm db:sync:prod
```
Syncs production database to local environment for testing migrations.

## Structure

- `schemas/` - Validation schemas for CSV data
- `*.test.ts` - Test files for migration scripts
- Individual script files for specific migration tasks