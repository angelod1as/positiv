# Docker MUST be running -- no containers required
# Don't forget to chmod +x this file :)

pnpm supabase db dump -f dump/full.sql
pnpm supabase db dump -f dump/roles.sql --role-only
pnpm supabase db dump -f dump/seed.sql --data-only