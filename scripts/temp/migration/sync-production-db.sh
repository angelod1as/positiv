#!/bin/bash

# Script para sincronizar banco de produção com banco local
# Uso: ./sync-production-db.sh [--dry-run]

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"
ENV_FILE="$PROJECT_ROOT/.env.vercel.production"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="production-dump-${TIMESTAMP}.sql"
DRY_RUN=false

# Verificar argumentos
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Função para exibir erro e sair
error_exit() {
  echo -e "${RED}❌ $1${NC}" >&2
  exit 1
}

# Função para exibir aviso
warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Função para exibir sucesso
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Função para exibir info
info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar se arquivo .env.vercel.production existe
if [[ ! -f "$ENV_FILE" ]]; then
  error_exit "Arquivo .env.vercel.production não encontrado em $PROJECT_ROOT"
fi

# Carregar variáveis de ambiente de produção
set -a
source "$ENV_FILE"
set +a

# Verificar variáveis necessárias
if [[ -z "${SUPABASE_CONNECT_URL:-}" ]]; then
  error_exit "SUPABASE_CONNECT_URL não está definido em .env.vercel.production"
fi

# Carregar variáveis locais
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  LOCAL_DATABASE_URL=$(grep "^SUPABASE_CONNECT_URL=" "$PROJECT_ROOT/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
else
  error_exit "Arquivo .env não encontrado. Execute 'cp ../positiv/.env .env' primeiro"
fi

if [[ -z "$LOCAL_DATABASE_URL" ]]; then
  error_exit "LOCAL_DATABASE_URL não está definido em .env"
fi

# Verificar se Supabase local está rodando
echo "Verificando conexão com banco local..."
if ! psql "$LOCAL_DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  error_exit "Local Supabase is not running. Execute 'supabase start' primeiro"
fi

# Modo dry-run
if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "========================================="
  echo "         DRY RUN MODE ATIVADO"
  echo "========================================="
  echo ""
  
  info "Would perform the following operations:"
  echo ""
  echo "1. Fazer backup do banco de produção"
  echo "   - Origem: Banco de produção Supabase"
  echo "   - Destino: $BACKUP_FILE"
  echo ""
  echo "2. Limpar banco local"
  echo "   - Dropar schema public"
  echo "   - Recriar schema public"
  echo ""
  echo "3. Restaurar dados de produção no banco local"
  echo "   - Origem: $BACKUP_FILE"
  echo "   - Destino: Banco local Supabase"
  echo ""
  echo "4. Verificar integridade dos dados"
  echo ""
  
  # Mostrar estatísticas atuais do banco de produção
  info "Estatísticas do banco de produção:"
  echo ""
  
  # Contar registros nas principais tabelas
  PROFILES_COUNT=$(psql "$SUPABASE_CONNECT_URL" -t -c "SELECT COUNT(*) FROM profiles" 2>/dev/null || echo "Erro")
  EVENTS_COUNT=$(psql "$SUPABASE_CONNECT_URL" -t -c "SELECT COUNT(*) FROM events" 2>/dev/null || echo "Erro")
  PARTICIPANTS_COUNT=$(psql "$SUPABASE_CONNECT_URL" -t -c "SELECT COUNT(*) FROM event_participants" 2>/dev/null || echo "Erro")
  
  echo "  - Profiles: $PROFILES_COUNT"
  echo "  - Events: $EVENTS_COUNT"
  echo "  - Event Participants: $PARTICIPANTS_COUNT"
  echo ""
  
  success "Nenhuma alteração foi feita (dry-run mode)"
  exit 0
fi

# Modo normal - pedir confirmação
warning "ATENÇÃO: Isso apagará TODOS os dados locais (seeded data)!"
echo ""
echo "Esta operação irá:"
echo "  1. Fazer backup completo do banco de produção"
echo "  2. APAGAR todos os dados do banco local"
echo "  3. Restaurar os dados de produção no banco local"
echo ""
read -p "Deseja continuar? (digite 'sim' para confirmar): " CONFIRM

if [[ "$CONFIRM" != "sim" ]]; then
  info "Operação cancelada"
  exit 0
fi

# 1. Fazer backup do banco de produção
info "📥 Baixando dados de produção..."
if ! pg_dump "$SUPABASE_CONNECT_URL" --clean --if-exists --no-owner --no-privileges > "$BACKUP_FILE"; then
  error_exit "Erro ao fazer backup do banco de produção"
fi
success "Backup criado: $BACKUP_FILE"

# 2. Limpar banco local
info "🗑️  Limpando banco local..."
if ! psql "$LOCAL_DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1; then
  error_exit "Erro ao limpar banco local"
fi
success "Banco local limpo"

# 3. Restaurar dados no banco local
info "📤 Restaurando dados de produção..."
if ! psql "$LOCAL_DATABASE_URL" < "$BACKUP_FILE" > /dev/null 2>&1; then
  error_exit "Erro ao restaurar dados no banco local"
fi
success "Dados restaurados com sucesso"

# 4. Verificar integridade
info "✅ Verificando integridade..."
echo ""

# Contar registros nas principais tabelas
PROFILES_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM profiles" 2>/dev/null || echo "0")
EVENTS_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM events" 2>/dev/null || echo "0")
PARTICIPANTS_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM event_participants" 2>/dev/null || echo "0")
USERS_WITH_ID=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM profiles WHERE user_id IS NOT NULL" 2>/dev/null || echo "0")
COMPLETED_EVENTS=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM events WHERE event_status = 'Completed'" 2>/dev/null || echo "0")

echo "Estatísticas do banco local após sincronização:"
echo "  - Profiles: $PROFILES_COUNT"
echo "  - Events: $EVENTS_COUNT"
echo "  - Event Participants: $PARTICIPANTS_COUNT"
echo "  - Profiles com user_id: $USERS_WITH_ID"
echo "  - Eventos completados: $COMPLETED_EVENTS"
echo ""

success "Sincronização concluída com sucesso!"
echo ""
info "Arquivo de backup preservado em: $BACKUP_FILE"
info "Para restaurar os dados seeded, execute: 'supabase db reset'"