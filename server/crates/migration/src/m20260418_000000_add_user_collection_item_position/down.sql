ALTER TABLE
  "public"."user_collection_item"
  DROP CONSTRAINT IF EXISTS "user_collection_item_user_collection_id_position_key";

ALTER TABLE "public"."user_collection_item"
  DROP COLUMN "position";

ALTER TABLE
  "public"."user_collection_item" RENAME CONSTRAINT "user_collection_item_user_collection_id_fkey" TO "user_list_item_user_list_id_fkey";

ALTER TABLE
  "public"."user_collection_item" RENAME COLUMN "user_collection_id" TO "user_list_id";

ALTER TABLE
  "public"."user_collection_item" RENAME CONSTRAINT "user_collection_item_pkey" TO "user_list_item_pkey";

ALTER SEQUENCE IF EXISTS "public"."user_collection_item_id_seq" RENAME TO "user_list_item_id_seq";

ALTER TABLE "public"."user_collection_item" RENAME TO "user_list_item";

ALTER TABLE
  "public"."user_collection" RENAME CONSTRAINT "user_collection_pkey" TO "user_list_pkey";

ALTER SEQUENCE IF EXISTS "public"."user_collection_id_seq" RENAME TO "user_list_id_seq";

ALTER TABLE "public"."user_collection" RENAME TO "user_list";
