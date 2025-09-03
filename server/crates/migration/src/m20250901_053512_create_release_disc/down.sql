ALTER TABLE
  release_track
  DROP COLUMN disc_id;

ALTER TABLE
  release_track_history
  DROP COLUMN disc_history_id;

DROP TABLE release_disc;

DROP TABLE release_disc_history;
