CREATE TABLE "public"."correction_subscription" (
  "user_id" INTEGER NOT NULL REFERENCES "public"."user" ("id") ON DELETE CASCADE,
  "correction_id" INTEGER NOT NULL REFERENCES "public"."correction" ("id") ON DELETE CASCADE,
  PRIMARY KEY ("user_id", "correction_id")
);

CREATE INDEX "idx_correction_subscription_correction_id"
ON "public"."correction_subscription" (
  "correction_id"
);

CREATE TABLE "public"."image_queue_subscription" (
  "user_id" INTEGER NOT NULL REFERENCES "public"."user" ("id") ON DELETE CASCADE,
  "image_queue_id" INTEGER NOT NULL REFERENCES "public"."image_queue" ("id") ON DELETE CASCADE,
  PRIMARY KEY ("user_id", "image_queue_id")
);

CREATE INDEX "idx_image_queue_subscription_image_queue_id"
ON "public"."image_queue_subscription" (
  "image_queue_id"
);

INSERT INTO "public"."correction_subscription" ("user_id", "correction_id")
SELECT DISTINCT
  "author_id",
  "correction_id"
FROM "public"."correction_revision"
ON CONFLICT DO NOTHING;

INSERT INTO "public"."correction_subscription" ("user_id", "correction_id")
SELECT DISTINCT
  "comment"."author_id",
  target."correction_id"
FROM "public"."comment" AS "comment"
INNER JOIN "public"."comment_thread" AS thread
  ON "comment"."thread_id" = thread."id"
INNER JOIN "public"."comment_target" AS target
  ON thread."target_id" = target."id"
WHERE target."correction_id" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "public"."image_queue_subscription" ("user_id", "image_queue_id")
SELECT
  "created_by",
  "id"
FROM "public"."image_queue"
ON CONFLICT DO NOTHING;
