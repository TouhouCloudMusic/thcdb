CREATE TYPE storage_backend AS ENUM('fs');

ALTER TABLE image
ADD COLUMN "backend" storage_backend;

UPDATE image
SET
	"backend" = 'fs'
WHERE
	"backend" IS NULL;

ALTER TABLE image
ALTER COLUMN "backend"
SET NOT NULL;
