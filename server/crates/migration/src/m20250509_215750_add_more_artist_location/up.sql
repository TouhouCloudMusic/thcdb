ALTER TABLE
  artist RENAME COLUMN location_country TO current_location_country;

ALTER TABLE
  artist RENAME COLUMN location_province TO current_location_province;

ALTER TABLE
  artist RENAME COLUMN location_city TO current_location_city;

ALTER TABLE
  artist
ADD
  COLUMN start_location_country TEXT,
ADD
  COLUMN start_location_province TEXT,
ADD
  COLUMN start_location_city TEXT;

ALTER TABLE
  artist_history RENAME COLUMN location_country TO current_location_country;

ALTER TABLE
  artist_history RENAME COLUMN location_province TO current_location_province;

ALTER TABLE
  artist_history RENAME COLUMN location_city TO current_location_city;

ALTER TABLE
  artist_history
ADD
  COLUMN start_location_country TEXT,
ADD
  COLUMN start_location_province TEXT,
ADD
  COLUMN start_location_city TEXT;
