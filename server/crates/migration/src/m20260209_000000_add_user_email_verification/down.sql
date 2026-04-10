DROP TABLE IF EXISTS "public"."user_email_verification";

DROP INDEX IF EXISTS "public"."uniq_user_email_lower";

ALTER TABLE
  "public"."user"
  DROP COLUMN IF EXISTS "email_verified",
  DROP COLUMN IF EXISTS "email",
  DROP COLUMN IF EXISTS "created_at";
