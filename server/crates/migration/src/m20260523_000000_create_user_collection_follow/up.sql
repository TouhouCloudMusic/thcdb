CREATE TABLE "public"."user_collection_follow" (
  "user_id" INT NOT NULL REFERENCES "public"."user" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "collection_id" INT NOT NULL REFERENCES "public"."user_collection" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "followed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("user_id", "collection_id")
);

CREATE INDEX "user_collection_follow_collection_id_idx" ON "public"."user_collection_follow" ("collection_id");

CREATE INDEX "user_collection_follow_user_followed_at_idx" ON "public"."user_collection_follow" ("user_id", "followed_at" DESC);
