ALTER TABLE "public"."user_collection_item"
  DROP CONSTRAINT "user_collection_item_sort_key_unique";

ALTER TABLE "public"."user_collection_item" RENAME COLUMN "sort_key" TO "position";

ALTER TABLE "public"."user_collection_item"
  ADD CONSTRAINT "user_collection_item_user_collection_id_position_key" UNIQUE ("user_collection_id", "position") DEFERRABLE INITIALLY IMMEDIATE;
