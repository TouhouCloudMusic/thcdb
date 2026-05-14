ALTER TABLE
  "public"."comment"
  ADD COLUMN "target" "public"."CommentTarget",
  ADD COLUMN "target_id" INTEGER;

DO
$$
BEGIN
IF EXISTS (
  SELECT 1
  FROM
    "public"."comment" AS "comment"
    JOIN "public"."comment_thread" AS "thread" ON "comment"."thread_id" = "thread"."id"
    JOIN "public"."comment_target" AS "target_ref" ON "thread"."target_id" = "target_ref"."id"
  WHERE "target_ref"."correction_id" IS NULL
) THEN RAISE EXCEPTION 'Cannot safely revert comment_thread migration while non-correction comments exist';

END IF;

END;

$$;

UPDATE "public"."comment" AS "comment" SET
  "target" = 'Correction',
  "target_id" = "target_ref"."correction_id"
FROM
  "public"."comment_thread" AS "thread"
  JOIN "public"."comment_target" AS "target_ref" ON "thread"."target_id" = "target_ref"."id"
WHERE "comment"."thread_id" = "thread"."id";

ALTER TABLE "public"."comment"
  ALTER COLUMN "target"
SET NOT NULL,
  ALTER COLUMN "target_id"
SET NOT NULL;

DROP INDEX IF EXISTS "public"."idx_comment_thread_list";

ALTER TABLE
  "public"."comment"
  DROP CONSTRAINT IF EXISTS "fk_comment_parent_id_thread_id",
  DROP CONSTRAINT IF EXISTS "uniq_comment_id_thread_id",
  DROP CONSTRAINT IF EXISTS "fk_comment_thread_id";

ALTER TABLE
  "public"."comment"
  ADD CONSTRAINT "comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comment" ("id"),
  ADD CONSTRAINT "uniq_comment_id_target_target_id" UNIQUE ("id", "target", "target_id"),
  ADD CONSTRAINT "fk_comment_parent_id_target_target_id" FOREIGN KEY ("parent_id", "target", "target_id") REFERENCES "public"."comment" ("id", "target", "target_id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE
  "public"."comment"
  ADD CONSTRAINT "fk_comment_target_id_correction_id" FOREIGN KEY ("target_id") REFERENCES "public"."correction" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "idx_comment_correction_list" ON "public"."comment" ("target", "target_id", "created_at", "id");

ALTER TABLE "public"."comment"
  DROP COLUMN "thread_id";

DROP TABLE IF EXISTS "public"."comment_thread";

DROP TABLE IF EXISTS "public"."comment_target";
