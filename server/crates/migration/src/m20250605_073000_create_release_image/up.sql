CREATE TYPE "release_image_type" AS ENUM ('Cover');

CREATE TABLE "release_image" (
  release_id INTEGER NOT NULL REFERENCES release (id),
  image_id INTEGER NOT NULL REFERENCES image (id),
  type release_image_type NOT NULL,
  PRIMARY KEY (release_id, image_id)
);

CREATE TABLE "release_image_queue" (
  release_id INTEGER NOT NULL REFERENCES release (id),
  queue_id INTEGER NOT NULL REFERENCES image_queue (id),
  type release_image_type NOT NULL,
  PRIMARY KEY (release_id, queue_id)
);
