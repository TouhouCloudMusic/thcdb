ALTER TABLE
  "public"."user"
ADD
  COLUMN "email" TEXT NOT NULL,
ADD
  COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
ADD
  COLUMN "created_at" timestamptz NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX "uniq_user_email_lower" ON "public"."user" (lower("email"));

CREATE TABLE "public"."user_email_verification" (
  "user_id" INTEGER PRIMARY KEY REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "hash" TEXT NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "sent_at" timestamptz NOT NULL,
  "failed_attempts" INTEGER NOT NULL DEFAULT 0
);
