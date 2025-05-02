#!/bin/sh
# Don't forget to chmod +x this file :)

source .env.local

pnpm cf-content-types-generator -s $CONTENTFUL_SPACE_ID  -t $CONTENTFUL_MANAGEMENT_TOKEN -o src/types/contentful/generated -X -r