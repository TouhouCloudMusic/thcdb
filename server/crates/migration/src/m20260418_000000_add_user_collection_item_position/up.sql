ALTER TABLE "public"."user_list" RENAME TO "user_collection";

ALTER TABLE
  "public"."user_collection" RENAME CONSTRAINT "user_list_pkey" TO "user_collection_pkey";

ALTER SEQUENCE IF EXISTS "public"."user_list_id_seq" RENAME TO "user_collection_id_seq";

ALTER TABLE "public"."user_list_item" RENAME TO "user_collection_item";

ALTER TABLE
  "public"."user_collection_item" RENAME CONSTRAINT "user_list_item_pkey" TO "user_collection_item_pkey";

ALTER SEQUENCE IF EXISTS "public"."user_list_item_id_seq" RENAME TO "user_collection_item_id_seq";

ALTER TABLE
  "public"."user_collection_item" RENAME COLUMN "user_list_id" TO "user_collection_id";

ALTER TABLE
  "public"."user_collection_item" RENAME CONSTRAINT "user_list_item_user_list_id_fkey" TO "user_collection_item_user_collection_id_fkey";

ALTER TABLE "public"."user_collection_item"
  ADD COLUMN "position" INTEGER;

WITH
ranked_items AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "user_collection_id"
      ORDER BY "id"
    ) - 1 AS "position"
  FROM "public"."user_collection_item"
)
UPDATE "public"."user_collection_item" AS "item" SET
  "position" = "ranked"."position"
FROM ranked_items AS "ranked"
WHERE "item"."id" = "ranked"."id";

ALTER TABLE "public"."user_collection_item"
  ALTER COLUMN "position"
SET NOT NULL;

ALTER TABLE
  "public"."user_collection_item"
  ADD CONSTRAINT "user_collection_item_user_collection_id_position_key" UNIQUE ("user_collection_id", "position") DEFERRABLE INITIALLY IMMEDIATE;
