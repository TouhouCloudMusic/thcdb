-- For release_track
ALTER TABLE
  release_track
ALTER COLUMN
  duration TYPE INTEGER USING EXTRACT(EPOCH
    FROM
      duration) * 1000;

-- For release_track_history
ALTER TABLE
  release_track_history
ALTER COLUMN
  duration TYPE INTEGER USING EXTRACT(EPOCH
    FROM
      duration) * 1000;
