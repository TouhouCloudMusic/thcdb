ALTER INDEX "public"."idx_comment_in_reply_to_comment_id"
  RENAME TO "idx_comment_parent_id";

ALTER TABLE "public"."comment"
  RENAME CONSTRAINT "fk_comment_in_reply_to_comment_id_thread_id" TO "fk_comment_parent_id_thread_id";

ALTER TABLE "public"."comment"
  RENAME COLUMN "in_reply_to_comment_id" TO "parent_id";
