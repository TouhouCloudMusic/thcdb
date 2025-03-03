ALTER TABLE "release" DROP CONSTRAINT "release_release_type_release_type_id_fk";
--> statement-breakpoint
DROP TABLE "release_type";--> statement-breakpoint
CREATE TYPE "public"."release_type" AS ENUM('Album', 'EP', 'Single');--> statement-breakpoint
ALTER TABLE "release_track_credit" RENAME TO "release_track_artist";--> statement-breakpoint
ALTER TABLE "release_track_artist" DROP CONSTRAINT "release_track_credit_release_track_id_release_track_id_fk";
--> statement-breakpoint
ALTER TABLE "release_track_artist" DROP CONSTRAINT "release_track_credit_artist_id_artist_id_fk";
--> statement-breakpoint
ALTER TABLE "queue" DROP COLUMN "new_data";--> statement-breakpoint
ALTER TABLE "queue" ADD COLUMN "new_data" jsonb[];--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "release_track_artist" ADD CONSTRAINT "release_track_artist_release_track_id_release_track_id_fk" FOREIGN KEY ("release_track_id") REFERENCES "public"."release_track"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "release_track_artist" ADD CONSTRAINT "release_track_artist_artist_id_artist_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
