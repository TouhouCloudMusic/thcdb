CREATE TABLE "public"."entity_popularity" (
  "entity_type" TEXT NOT NULL,
  "entity_id" INT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  PRIMARY KEY ("entity_type", "entity_id")
);

CREATE INDEX "idx_entity_popularity_order"
  ON "public"."entity_popularity" ("entity_type", "score" DESC, "entity_id");

CREATE TABLE "public"."popularity_snapshot" (
  "id" INT PRIMARY KEY CHECK ("id" = 1),
  "calculated_at" TIMESTAMPTZ NOT NULL
);
