CREATE TABLE IF NOT EXISTS "public"."notification_setting" (
  "user_id" INTEGER NOT NULL REFERENCES "public"."user" ("id"),
  "comment_reply_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "comment_mention_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "correction_status_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_follower_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "email_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY ("user_id")
);

INSERT INTO "public"."notification_setting" (
  "user_id",
  "comment_reply_enabled",
  "comment_mention_enabled",
  "correction_status_enabled",
  "new_follower_enabled",
  "email_enabled"
)
SELECT
  u."id" AS "user_id",
  COALESCE((u."settings"->'notification'->>'comment_reply_enabled')::boolean, TRUE),
  COALESCE((u."settings"->'notification'->>'comment_mention_enabled')::boolean, TRUE),
  COALESCE((u."settings"->'notification'->>'correction_status_enabled')::boolean, TRUE),
  COALESCE((u."settings"->'notification'->>'new_follower_enabled')::boolean, TRUE),
  COALESCE((u."settings"->'notification'->>'email_enabled')::boolean, FALSE)
FROM "public"."user" u
ON CONFLICT ("user_id") DO NOTHING;

ALTER TABLE "public"."user"
DROP COLUMN IF EXISTS "settings";

