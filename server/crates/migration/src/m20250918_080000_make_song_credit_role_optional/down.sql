-- song_credit
DROP INDEX IF EXISTS "uniq_song_credit_credit_role_null";

DROP INDEX IF EXISTS "uniq_song_credit_credit_role_not_null";

ALTER TABLE
  "public"."song_credit"
  DROP CONSTRAINT "song_credit_pkey";

ALTER TABLE
  "public"."song_credit"
  DROP COLUMN "id",
ALTER COLUMN
  "role_id"
SET
  NOT NULL;

ALTER TABLE
  "public"."song_credit"
ADD
  CONSTRAINT "song_credit_pkey" PRIMARY KEY ("song_id", "artist_id", "role_id");

-- song_credit_history
DROP INDEX IF EXISTS "uniq_song_credit_history_credit_role_null";

DROP INDEX IF EXISTS "uniq_song_credit_history_credit_role_not_null";

ALTER TABLE
  "public"."song_credit_history"
  DROP CONSTRAINT "song_credit_history_pkey";

ALTER TABLE
  "public"."song_credit_history"
  DROP COLUMN "id",
ALTER COLUMN
  "role_id"
SET
  NOT NULL;

ALTER TABLE
  "public"."song_credit_history"
ADD
  CONSTRAINT "song_credit_history_pkey" PRIMARY KEY ("history_id", "artist_id", "role_id");
