DROP TABLE "public"."label_link_history";
DROP TABLE "public"."label_link";
DROP TABLE "public"."event_link_history";
DROP TABLE "public"."event_link";
DROP TABLE "public"."song_link_history";
DROP TABLE "public"."song_link";
DROP TABLE "public"."release_link_history";
DROP TABLE "public"."release_link";

ALTER TABLE "public"."artist_link_history"
  DROP CONSTRAINT "uq_artist_link_history_history_id_url";

ALTER TABLE "public"."artist_link"
  DROP CONSTRAINT "uq_artist_link_artist_id_url";
