#!/bin/sh
# Don't forget to chmod +x this file :)

source .env

supabase db reset --db-url $STAGING_SUPABASE_CONNECT_URL