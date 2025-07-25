# CSV Event Import Script

Script para importar eventos históricos de um arquivo CSV para o banco de dados Positiv.

## Uso

```bash
# Executar com validação apenas (dry-run)
npx tsx scripts/csv-import/index.ts eventos.csv --dry-run

# Gerar SQL e exibir no console
npx tsx scripts/csv-import/index.ts eventos.csv

# Gerar SQL e salvar em arquivo
npx tsx scripts/csv-import/index.ts eventos.csv --output eventos.sql
```

## Formato do CSV

O arquivo CSV deve conter as seguintes colunas obrigatórias:

| Coluna | Descrição | Validação |
|--------|-----------|-----------|
| `title` | Título do evento | 2-50 caracteres |
| `description` | Descrição do evento | 2-255 caracteres |
| `emoji` | Emoji do evento | Emoji válido |
| `location` | Local do evento | 2-255 caracteres |
| `ticket_price` | Preço do ingresso | Numérico, mínimo 1 |
| `total_spots` | Total de vagas | Inteiro, mínimo 1 |
| `time_event_start` | Data/hora de início | YYYY-MM-DD HH:MM:SS |
| `event_type` | Tipo do evento | "regular" ou "bdsm" |

### Exemplo de CSV

```csv
title,description,emoji,location,ticket_price,total_spots,time_event_start,event_type
"Workshop de Iniciação","Introdução ao BDSM para iniciantes","🎭","Rua Augusta 123, São Paulo",50.00,30,2024-06-15 19:00:00,bdsm
"Encontro Social","Evento social para a comunidade","🤝","Bar Alternativo, Vila Madalena",25.00,50,2024-07-20 20:00:00,regular
```

## Opções

- `--dry-run`: Executa apenas a validação, sem gerar SQL
- `--output <arquivo>`, `-o <arquivo>`: Salva o SQL gerado em um arquivo
- `--help`, `-h`: Exibe ajuda

## Datas Calculadas

O script calcula automaticamente todas as datas derivadas com base na data de início do evento:

- `time_event_end`: Mesmo dia, 23:59
- `time_application_start`: -30 dias, 08:00
- `time_application_end`: -23 dias, 22:00
- `time_interviews_start`: -21 dias, 08:00
- `time_interviews_end`: -9 dias, 22:00
- `time_group_start`: -7 dias, 08:00
- `time_group_end`: +30 dias, 22:00
- `time_payment_start`: -21 dias, 08:00
- `time_payment_end`: -9 dias, 22:00
- `created_at`: Usa `time_application_start`

## Valores Fixos

- `event_status`: Sempre "Completed" (eventos históricos são finalizados)
- `id`: UUID gerado automaticamente (usando `gen_random_uuid()` do PostgreSQL)

## Executando o SQL Gerado

Após validar e gerar o SQL:

1. Revise o arquivo SQL gerado
2. Execute em produção com cuidado:

```bash
psql -h <host> -U <user> -d <database> -f eventos.sql
```

## Relatório de Importação

O script sempre exibe um relatório com:
- Número de eventos válidos
- Número de erros encontrados
- Lista de erros de validação (se houver)
- Lista de eventos válidos processados

## Notas Importantes

- Este é um script de uso único para migração de dados históricos
- Não será adicionado às migrations do projeto
- Sempre teste com `--dry-run` antes de gerar o SQL final
- Revise cuidadosamente o SQL antes de executar em produção