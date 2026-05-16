ALTER TABLE
  "public"."tag_alternative_name"
  DROP CONSTRAINT IF EXISTS "tag_alternative_name_tag_id_fkey",
  DROP CONSTRAINT IF EXISTS "tag_alternative_name_language_id_fkey";

ALTER TABLE
  "public"."tag_alternative_name"
  ADD CONSTRAINT "tag_alternative_name_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tag" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  ADD CONSTRAINT "tag_alternative_name_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."language" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
