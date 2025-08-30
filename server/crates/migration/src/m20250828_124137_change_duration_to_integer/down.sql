-- For release_track
ALTER TABLE
  release_track
ALTER COLUMN
  duration TYPE INTERVAL USING make_interval(secs => duration / 1000.0);

-- For release_track_history
ALTER TABLE
  release_track_history
ALTER COLUMN
  duration TYPE INTERVAL USING make_interval(secs => duration / 1000.0);
