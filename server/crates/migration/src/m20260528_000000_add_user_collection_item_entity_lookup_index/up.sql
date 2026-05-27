CREATE INDEX "idx_user_collection_item_entity_type_entity_id_collection_id" ON "public"."user_collection_item" (
  "entity_type",
  "entity_id",
  "user_collection_id"
);
