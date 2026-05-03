DROP INDEX IF EXISTS "public"."idx_comment_author_id";

DROP INDEX IF EXISTS "public"."idx_comment_parent_id";

DROP INDEX IF EXISTS "public"."idx_comment_correction_list";

ALTER TABLE
  "public"."comment"
  DROP CONSTRAINT IF EXISTS "fk_comment_parent_id_target_target_id",
  DROP CONSTRAINT IF EXISTS "uniq_comment_id_target_target_id",
  DROP CONSTRAINT IF EXISTS "fk_comment_target_id_correction_id";
