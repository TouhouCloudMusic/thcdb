-- Enable pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create gist indexes on main searchable text columns for fast similarity search
-- Artist name
CREATE INDEX IF NOT EXISTS idx_artist_name_gist ON "public"."artist" USING gist ("name" gist_trgm_ops);

-- Artist localized names
CREATE INDEX IF NOT EXISTS idx_artist_localized_name_gist ON "public"."artist_localized_name" USING gist ("name" gist_trgm_ops);

-- Event name
CREATE INDEX IF NOT EXISTS idx_event_name_gist ON "public"."event" USING gist ("name" gist_trgm_ops);

-- Event alternative names
CREATE INDEX IF NOT EXISTS idx_event_alternative_name_gist ON "public"."event_alternative_name" USING gist ("name" gist_trgm_ops);

-- Label name
CREATE INDEX IF NOT EXISTS idx_label_name_gist ON "public"."label" USING gist ("name" gist_trgm_ops);

-- Label localized names
CREATE INDEX IF NOT EXISTS idx_label_localized_name_gist ON "public"."label_localized_name" USING gist ("name" gist_trgm_ops);

-- Release title
CREATE INDEX IF NOT EXISTS idx_release_title_gist ON "public"."release" USING gist ("title" gist_trgm_ops);

-- Release localized titles
CREATE INDEX IF NOT EXISTS idx_release_localized_title_gist ON "public"."release_localized_title" USING gist ("title" gist_trgm_ops);

-- Song title
CREATE INDEX IF NOT EXISTS idx_song_title_gist ON "public"."song" USING gist ("title" gist_trgm_ops);

-- Tag name
CREATE INDEX IF NOT EXISTS idx_tag_name_gist ON "public"."tag" USING gist ("name" gist_trgm_ops);

-- Tag alternative names
CREATE INDEX IF NOT EXISTS idx_tag_alternative_name_gist ON "public"."tag_alternative_name" USING gist ("name" gist_trgm_ops);
