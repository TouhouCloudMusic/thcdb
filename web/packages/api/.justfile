set dotenv-load

gen:
  rm ./src/gen.ts
  pnpm exec openapi-typescript $API_SCHEMA -o ./src/gen.ts \
  --alphabetize \
  --array-length \
  --make-paths-enum \
  --export-type \
  --root-types \
  --root-types-no-schema-prefix
