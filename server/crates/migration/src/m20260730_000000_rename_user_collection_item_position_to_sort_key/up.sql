ALTER TABLE "public"."user_collection_item"
  DROP CONSTRAINT "user_collection_item_user_collection_id_position_key";

ALTER TABLE "public"."user_collection_item" RENAME COLUMN "position" TO "sort_key";

ALTER TABLE "public"."user_collection_item"
  ADD CONSTRAINT "user_collection_item_sort_key_unique" UNIQUE ("user_collection_id", "sort_key") DEFERRABLE INITIALLY DEFERRED;
