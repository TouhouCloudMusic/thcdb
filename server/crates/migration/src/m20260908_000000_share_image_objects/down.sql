DO $$ BEGIN
  RAISE EXCEPTION 'Image retention migration cannot be rolled back without losing retained review references.';
END $$;
