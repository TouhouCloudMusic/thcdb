-- PostgreSQL does not support removing values from enums directly.
-- To rollback this migration, you would need to:
-- 1. Create a new enum without 'CreditRole'
-- 2. Update all tables using EntityType to use the new enum
-- 3. Drop the old enum and rename the new one
--
-- This is a complex operation that requires careful handling of existing data.
-- For development environments, consider dropping and recreating the database.
--
-- Example manual rollback process (USE WITH CAUTION):
-- 1. CREATE TYPE "EntityType_new" AS ENUM('Artist', 'Label', 'Release', 'Song', 'Tag', 'Event', 'SongLyrics');
-- 2. Update all affected tables/columns to use EntityType_new
-- 3. DROP TYPE "EntityType";
-- 4. ALTER TYPE "EntityType_new" RENAME TO "EntityType";
SELECT
  1;

-- Placeholder to make this a valid SQL file
