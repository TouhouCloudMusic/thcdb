ALTER TABLE
  "public"."comment"
  ADD CONSTRAINT "fk_comment_target_id_correction_id" FOREIGN KEY ("target_id") REFERENCES "public"."correction" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "uniq_comment_id_target_target_id" UNIQUE ("id", "target", "target_id"),
  ADD CONSTRAINT "fk_comment_parent_id_target_target_id" FOREIGN KEY ("parent_id", "target", "target_id") REFERENCES "public"."comment" ("id", "target", "target_id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "idx_comment_correction_list" ON "public"."comment" ("target", "target_id", "created_at", "id");

CREATE INDEX "idx_comment_parent_id" ON "public"."comment" ("parent_id");

CREATE INDEX "idx_comment_author_id" ON "public"."comment" ("author_id");
