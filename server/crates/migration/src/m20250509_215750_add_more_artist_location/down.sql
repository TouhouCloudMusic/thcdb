ALTER TABLE artist
RENAME COLUMN current_location_country TO location_country;

ALTER TABLE artist
RENAME COLUMN current_location_province TO location_province;

ALTER TABLE artist
RENAME COLUMN current_location_city TO location_city;

ALTER TABLE artist
DROP COLUMN start_location_country,
DROP COLUMN start_location_province,
DROP COLUMN start_location_city;

ALTER TABLE artist_history
RENAME COLUMN current_location_country TO location_country;

ALTER TABLE artist_history
RENAME COLUMN current_location_province TO location_province;

ALTER TABLE artist_history
RENAME COLUMN current_location_city TO location_city;

ALTER TABLE artist_history
DROP COLUMN start_location_country,
DROP COLUMN start_location_province,
DROP COLUMN start_location_city;
