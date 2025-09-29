ALTER TABLE
  "public"."event"
  DROP COLUMN "location_country",
  DROP COLUMN "location_province",
  DROP COLUMN "location_city";

ALTER TABLE
  "public"."event_history"
  DROP COLUMN "location_country",
  DROP COLUMN "location_province",
  DROP COLUMN "location_city";
