#!/usr/bin/env bash
set -eo pipefail

schema=$1
if [[ -z $schema ]]; then
  mkdir -p tmp
  schema="./tmp/openapi.json"
  (cd ../server && cargo run -- --openapi ../web/tmp/openapi.json)
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
