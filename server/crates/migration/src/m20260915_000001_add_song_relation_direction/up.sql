CREATE TYPE "public"."SongRelationType" AS ENUM (
  'Derived', 'Arrangement', 'Cover', 'Remix', 'Live', 'Instrumental', 'Medley'
);

ALTER TABLE "public"."song_relation" ADD COLUMN "relation_type" "public"."SongRelationType";
ALTER TABLE "public"."song_relation_history" ADD COLUMN "relation_type" "public"."SongRelationType";

-- Translate the six existing type IDs into their explicit domain values.
UPDATE "public"."song_relation"
SET "relation_type" = CASE "relation_type_id"
  WHEN 1 THEN 'Derived'
  WHEN 2 THEN 'Arrangement'
  WHEN 3 THEN 'Cover'
  WHEN 4 THEN 'Remix'
  WHEN 5 THEN 'Live'
  WHEN 6 THEN 'Instrumental'
END::"public"."SongRelationType";

-- Preserve the relation type in every historical snapshot using the same mapping.
UPDATE "public"."song_relation_history"
SET "relation_type" = CASE "relation_type_id"
  WHEN 1 THEN 'Derived'
  WHEN 2 THEN 'Arrangement'
  WHEN 3 THEN 'Cover'
  WHEN 4 THEN 'Remix'
  WHEN 5 THEN 'Live'
  WHEN 6 THEN 'Instrumental'
END::"public"."SongRelationType";

ALTER TABLE "public"."song_relation"
  ALTER COLUMN "relation_type" SET NOT NULL,
  DROP COLUMN "relation_type_id";
ALTER TABLE "public"."song_relation_history"
  ALTER COLUMN "relation_type" SET NOT NULL,
  DROP COLUMN "relation_type_id";
DROP TABLE "public"."song_relation_type";

ALTER TABLE "public"."song_relation"
  ADD COLUMN "source_id" INTEGER REFERENCES "public"."song" ("id"),
  ADD COLUMN "derived_id" INTEGER REFERENCES "public"."song" ("id");

-- Apply the manually confirmed directions to the current relations.
UPDATE "public"."song_relation" AS relation
SET
  "source_id" = backfill."source_id",
  "derived_id" = backfill."derived_id"
FROM "public"."song_relation_direction_backfill" AS backfill
WHERE relation."id" = backfill."relation_id";

-- Require an explicit direction for every existing relation before removing the old endpoints.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."song_relation"
    WHERE "source_id" IS NULL OR "derived_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'song_relation direction backfill is incomplete';
  END IF;
END
$$;

ALTER TABLE "public"."song_relation"
  ALTER COLUMN "source_id" SET NOT NULL,
  ALTER COLUMN "derived_id" SET NOT NULL,
  DROP CONSTRAINT "song_relation_check",
  DROP COLUMN "first_id",
  DROP COLUMN "second_id",
  ADD CONSTRAINT "song_relation_distinct_songs" CHECK ("source_id" <> "derived_id"),
  ADD CONSTRAINT "song_relation_unique" UNIQUE ("source_id", "derived_id", "relation_type");

CREATE INDEX "idx_song_relation_derived_id" ON "public"."song_relation" ("derived_id");

ALTER TABLE "public"."song_relation_history"
  ADD COLUMN "source_id" INTEGER REFERENCES "public"."song" ("id"),
  ADD COLUMN "derived_id" INTEGER REFERENCES "public"."song" ("id");

-- Apply the manually confirmed directions to the historical relation snapshots.
UPDATE "public"."song_relation_history" AS relation
SET
  "source_id" = backfill."source_id",
  "derived_id" = backfill."derived_id"
FROM "public"."song_relation_history_direction_backfill" AS backfill
WHERE relation."id" = backfill."relation_history_id";

-- Require an explicit direction for every historical relation before removing related_song_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."song_relation_history"
    WHERE "source_id" IS NULL OR "derived_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'song_relation_history direction backfill is incomplete';
  END IF;
END
$$;

ALTER TABLE "public"."song_relation_history"
  ALTER COLUMN "source_id" SET NOT NULL,
  ALTER COLUMN "derived_id" SET NOT NULL,
  DROP COLUMN "related_song_id",
  ADD CONSTRAINT "song_relation_history_distinct_songs" CHECK ("source_id" <> "derived_id"),
  ADD CONSTRAINT "song_relation_history_unique" UNIQUE ("history_id", "source_id", "derived_id", "relation_type");

DROP INDEX IF EXISTS "idx_song_relation_history_history_id";

DROP TABLE "public"."song_relation_history_direction_backfill";
DROP TABLE "public"."song_relation_direction_backfill";
