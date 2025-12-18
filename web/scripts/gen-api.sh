#!/usr/bin/env bash
set -euo pipefail

schema=$1
if [[ -z $schema ]]; then 
  echo "API_SCHEMA 不能为空（或设置 VITE_SERVER_URL）" >&2
  exit 1
fi 
rm -f packages/api/src/gen.ts
pnpm exec openapi-typescript $schema \
  -o packages/api/src/gen.ts \
  --alphabetize \
  --array-length \
  --make-paths-enum \
  --export-type \
  --root-types \
  --root-types-no-schema-prefix 
