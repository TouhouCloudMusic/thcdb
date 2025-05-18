DROP TABLE "public"."image_queue";

DROP TYPE "public"."ImageQueueStatus";

ALTER TABLE "public"."image"
RENAME COLUMN "uploaded_at" TO "created_at";
