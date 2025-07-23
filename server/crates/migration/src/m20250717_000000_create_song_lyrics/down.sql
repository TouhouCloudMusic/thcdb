-- Drop song lyrics tables
DROP TABLE IF EXISTS "public"."song_lyrics_history";

DROP TABLE IF EXISTS "public"."song_lyrics";

-- Note: Cannot remove enum value from EntityType in PostgreSQL
-- The SongLyrics value will remain in the enum but unused
