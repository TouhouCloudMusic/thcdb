DROP INDEX IF EXISTS idx_artist_name_gist;

CREATE INDEX idx_artist_name_gist ON "public"."artist" USING gist (lower("name") gist_trgm_ops);

DROP INDEX IF EXISTS idx_artist_localized_name_gist;

CREATE INDEX idx_artist_localized_name_gist ON "public"."artist_localized_name" USING gist (lower("name") gist_trgm_ops);

DROP INDEX IF EXISTS idx_event_name_gist;

CREATE INDEX idx_event_name_gist ON "public"."event" USING gist (lower("name") gist_trgm_ops);

DROP INDEX IF EXISTS idx_event_alternative_name_gist;

CREATE INDEX idx_event_alternative_name_gist ON "public"."event_alternative_name" USING gist (lower("name") gist_trgm_ops);

DROP INDEX IF EXISTS idx_label_name_gist;

CREATE INDEX idx_label_name_gist ON "public"."label" USING gist (lower("name") gist_trgm_ops);

DROP INDEX IF EXISTS idx_label_localized_name_gist;

CREATE INDEX idx_label_localized_name_gist ON "public"."label_localized_name" USING gist (lower("name") gist_trgm_ops);

DROP INDEX IF EXISTS idx_release_title_gist;

CREATE INDEX idx_release_title_gist ON "public"."release" USING gist (lower("title") gist_trgm_ops);

DROP INDEX IF EXISTS idx_release_localized_title_gist;

CREATE INDEX idx_release_localized_title_gist ON "public"."release_localized_title" USING gist (lower("title") gist_trgm_ops);

DROP INDEX IF EXISTS idx_song_title_gist;

CREATE INDEX idx_song_title_gist ON "public"."song" USING gist (lower("title") gist_trgm_ops);

DROP INDEX IF EXISTS idx_tag_name_gist;

CREATE INDEX idx_tag_name_gist ON "public"."tag" USING gist (lower("name") gist_trgm_ops);

DROP INDEX IF EXISTS idx_tag_alternative_name_gist;

CREATE INDEX idx_tag_alternative_name_gist ON "public"."tag_alternative_name" USING gist (lower("name") gist_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_song_localized_title_gist ON "public"."song_localized_title" USING gist (lower("title") gist_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_credit_role_name_gist ON "public"."credit_role" USING gist (lower("name") gist_trgm_ops);
