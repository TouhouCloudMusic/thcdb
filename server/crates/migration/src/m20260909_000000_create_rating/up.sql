CREATE DOMAIN "public"."rating" AS SMALLINT
  CHECK (VALUE BETWEEN 1 AND 10);

CREATE TABLE "public"."release_rating" (
  "release_id" INT NOT NULL REFERENCES "public"."release" ("id") ON DELETE CASCADE,
  "user_id" INT NOT NULL REFERENCES "public"."user" ("id") ON DELETE CASCADE,
  "rating" "public"."rating" NOT NULL,
  PRIMARY KEY ("release_id", "user_id")
);

CREATE INDEX "idx_release_rating_user_id"
  ON "public"."release_rating" ("user_id");

CREATE TABLE "public"."song_rating" (
  "song_id" INT NOT NULL REFERENCES "public"."song" ("id") ON DELETE CASCADE,
  "user_id" INT NOT NULL REFERENCES "public"."user" ("id") ON DELETE CASCADE,
  "rating" "public"."rating" NOT NULL,
  PRIMARY KEY ("song_id", "user_id")
);

CREATE INDEX "idx_song_rating_user_id"
  ON "public"."song_rating" ("user_id");
