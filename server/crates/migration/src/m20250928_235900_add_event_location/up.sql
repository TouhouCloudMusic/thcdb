ALTER TABLE
  "public"."event"
ADD
  COLUMN "location_country" TEXT NULL,
ADD
  COLUMN "location_province" TEXT NULL,
ADD
  COLUMN "location_city" TEXT NULL;

ALTER TABLE
  "public"."event_history"
ADD
  COLUMN "location_country" TEXT NULL,
ADD
  COLUMN "location_province" TEXT NULL,
ADD
  COLUMN "location_city" TEXT NULL;
