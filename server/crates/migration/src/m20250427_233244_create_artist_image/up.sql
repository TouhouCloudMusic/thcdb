CREATE TYPE "public"."ArtistImageType" AS ENUM('Profile');

CREATE TABLE
	"public"."artist_image_queue" (
		"artist_id" INTEGER NOT NULL REFERENCES "public"."artist" ("id"),
		"queue_id" INTEGER NOT NULL REFERENCES "public"."image_queue" ("id"),
		"type" "public"."ArtistImageType" NOT NULL,
		PRIMARY KEY ("artist_id", "queue_id")
	);

CREATE TABLE
	"public"."artist_image" (
		"artist_id" INTEGER NOT NULL REFERENCES "public"."artist" ("id"),
		"image_id" INTEGER NOT NULL REFERENCES "public"."image" ("id"),
		"type" "public"."ArtistImageType" NOT NULL,
		PRIMARY KEY ("artist_id", "image_id")
	);
