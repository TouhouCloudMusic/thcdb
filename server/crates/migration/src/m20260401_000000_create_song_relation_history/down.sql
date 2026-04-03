DROP INDEX IF EXISTS idx_song_relation_history_relation_type_id;

DROP INDEX IF EXISTS idx_song_relation_history_related_song_id;

DROP INDEX IF EXISTS idx_song_relation_history_history_id;

DROP TABLE IF EXISTS "public"."song_relation_history";

DROP INDEX IF EXISTS idx_song_relation_relation_type_id;

ALTER TABLE
  "public"."song_relation"
  DROP COLUMN "relation_type_id";

ALTER TABLE
  "public"."song_relation"
ADD
  COLUMN "relation_type" TEXT NOT NULL;

DROP TABLE IF EXISTS "public"."song_relation_type";
