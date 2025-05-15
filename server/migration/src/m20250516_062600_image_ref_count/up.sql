CREATE TABLE
	image_reference (
		image_id INT NOT NULL REFERENCES image (id) ON DELETE CASCADE,
		ref_entity_id INT NOT NULL,
		ref_entity_type "EntityType" NOT NULL,
		ref_usage TEXT NULL,
		PRIMARY KEY (image_id, ref_entity_id, ref_entity_type)
	);
