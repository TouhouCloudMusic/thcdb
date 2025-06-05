ALTER TABLE
  "public"."group_member_history" RENAME COLUMN history_id TO artist_history_id;

ALTER TABLE
  "public"."group_member_history" RENAME COLUMN artist_id TO related_artist_id;
