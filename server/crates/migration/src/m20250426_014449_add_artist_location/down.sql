ALTER TABLE "public"."artist"
DROP COLUMN "location_country",
DROP COLUMN "location_province",
DROP COLUMN "location_city";

ALTER TABLE "public"."artist_history"
DROP COLUMN "location_country",
DROP COLUMN "location_province",
DROP COLUMN "location_city";
