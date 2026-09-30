CREATE TABLE IF NOT EXISTS "public"."song_relation_direction_backfill" (
  "relation_id" INTEGER NOT NULL REFERENCES "public"."song_relation" ("id") ON DELETE CASCADE,
  "source_id" INTEGER NOT NULL REFERENCES "public"."song" ("id"),
  "derived_id" INTEGER NOT NULL REFERENCES "public"."song" ("id"),
  PRIMARY KEY ("relation_id"),
  CHECK ("source_id" <> "derived_id")
);

CREATE TABLE IF NOT EXISTS "public"."song_relation_history_direction_backfill" (
  "relation_history_id" INTEGER NOT NULL REFERENCES "public"."song_relation_history" ("id") ON DELETE CASCADE,
  "source_id" INTEGER NOT NULL REFERENCES "public"."song" ("id"),
  "derived_id" INTEGER NOT NULL REFERENCES "public"."song" ("id"),
  PRIMARY KEY ("relation_history_id"),
  CHECK ("source_id" <> "derived_id")
);
