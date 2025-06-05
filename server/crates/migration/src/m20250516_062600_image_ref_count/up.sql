CREATE TYPE image_ref_entity_type AS ENUM('Artist', 'User', 'Song', 'Label', 'Release');

CREATE TABLE image_reference (
  image_id INT NOT NULL REFERENCES image (id) ON DELETE CASCADE,
  ref_entity_id INT NOT NULL,
  ref_entity_type image_ref_entity_type NOT NULL,
  ref_usage TEXT,
  PRIMARY KEY (image_id, ref_entity_id, ref_entity_type)
);
