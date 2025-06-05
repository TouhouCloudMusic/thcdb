ALTER TABLE
  "public"."release_catalog_number"
ALTER COLUMN
  "catalog_number" DROP NOT NULL;

ALTER TABLE
  "public"."release_catalog_number_history"
ALTER COLUMN
  "catalog_number" DROP NOT NULL;
