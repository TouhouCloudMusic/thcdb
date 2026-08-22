DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."comment_target"
    WHERE "image_queue_id" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot safely remove image_queue comment targets while they are in use';
  END IF;
END;
$$;

ALTER TABLE "public"."comment_target"
  DROP CONSTRAINT "ck_comment_target_exactly_one_target",
  DROP CONSTRAINT "uniq_comment_target_image_queue_id",
  DROP COLUMN "image_queue_id";

ALTER TABLE "public"."comment_target"
  ADD CONSTRAINT "ck_comment_target_exactly_one_target" CHECK (
    num_nonnulls(
      "artist_id",
      "release_id",
      "song_id",
      "label_id",
      "event_id",
      "tag_id",
      "correction_id"
    ) = 1
  );
