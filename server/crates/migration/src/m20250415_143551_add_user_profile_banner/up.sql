ALTER TABLE
  "public"."user"
ADD
  COLUMN "profile_banner_id" INT NULL REFERENCES "public"."image" ("id");
