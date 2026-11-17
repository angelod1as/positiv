# Dumps the linked hosted project. Docker MUST be running -- no local stack required
# Don't forget to chmod +x this file :)

pnpm supabase db dump --remote -f dump/full.sql
pnpm supabase db dump --remote -f dump/roles.sql --role-only
pnpm supabase db dump --remote -f dump/seed.sql --data-only