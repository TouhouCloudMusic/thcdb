ALTER TABLE "public"."comment_target"
  ADD COLUMN "image_queue_id" INTEGER
    REFERENCES "public"."image_queue" ("id")
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  ADD CONSTRAINT "uniq_comment_target_image_queue_id" UNIQUE ("image_queue_id");

ALTER TABLE "public"."comment_target"
  DROP CONSTRAINT "ck_comment_target_exactly_one_target",
  ADD CONSTRAINT "ck_comment_target_exactly_one_target" CHECK (
    num_nonnulls(
      "artist_id",
      "release_id",
      "song_id",
      "label_id",
      "event_id",
      "tag_id",
      "correction_id",
      "image_queue_id"
    ) = 1
  );
