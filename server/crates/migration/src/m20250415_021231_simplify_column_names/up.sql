ALTER TABLE
  "public"."group_member_history" RENAME COLUMN artist_history_id TO history_id;

ALTER TABLE
  "public"."group_member_history" RENAME COLUMN related_artist_id TO artist_id;
