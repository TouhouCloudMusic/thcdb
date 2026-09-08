ALTER TABLE "public"."user_collection_item" ADD COLUMN "added_at" TIMESTAMPTZ;
-- Add default value for later records
ALTER TABLE "public"."user_collection_item" ALTER COLUMN "added_at" SET DEFAULT NOW();
