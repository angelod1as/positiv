# Event Mapping Script

Script interativo para mapear colunas de CSV para IDs de eventos no banco de dados.

## Como usar

```bash
# Executar o script
pnpm migration:event-mapping

# Ou diretamente com tsx
pnpm tsx scripts/temp/migration/generate-event-mapping.ts
```

## Funcionalidades

- 🔍 Busca automática de eventos por data e nome
- 💾 Salvamento de progresso (pode continuar de onde parou)
- 🎯 Interface interativa para confirmar/selecionar mapeamentos
- 📝 Geração de arquivo TypeScript com os mapeamentos

## Fluxo

1. O script busca todos os eventos do banco
2. Para cada coluna do CSV:
   - Tenta encontrar matches automáticos (por data/nome)
   - Apresenta opções ao usuário
   - Salva o mapeamento escolhido
3. Gera arquivo final `event-mapping.ts`

## Arquivos gerados

- `mapping-progress.json` - Progresso temporário (removido ao final)
- `event-mapping.ts` - Mapeamento final

## Casos de uso

### Match único encontrado
- Mostra o evento encontrado
- Pede confirmação

### Múltiplos matches
- Lista todos os eventos possíveis
- Permite escolher um ou buscar outros

### Nenhum match
- Opções para buscar manualmente
- Listar todos os eventos
- Marcar como não encontrado