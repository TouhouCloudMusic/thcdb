ALTER TABLE "public"."comment"
  RENAME COLUMN "parent_id" TO "in_reply_to_comment_id";

ALTER TABLE "public"."comment"
  RENAME CONSTRAINT "fk_comment_parent_id_thread_id" TO "fk_comment_in_reply_to_comment_id_thread_id";

ALTER INDEX "public"."idx_comment_parent_id"
  RENAME TO "idx_comment_in_reply_to_comment_id";
