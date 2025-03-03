DROP INDEX IF EXISTS "user_name_index";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user" ADD CONSTRAINT "user_avatar_id_image_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
