#!/bin/sh
# Don't forget to chmod +x this file :)

source .env

echo "Generating Types from Supabase"

# Default command
SUPABASE_COMMAND="pnpx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public"

# Check if the --local flag is provided
if [ "$1" = "--local" ]; then
  SUPABASE_COMMAND="pnpx supabase gen types typescript --local --schema public"
fi

# Execute the chosen command and redirect output
$SUPABASE_COMMAND > app/types/database/database.types.ts

echo "Supabase types generation complete."