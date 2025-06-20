#!/bin/sh
# Don't forget to chmod +x this file :)

source .env

supabase db reset --db-url $STAGING_CONNECT_URL