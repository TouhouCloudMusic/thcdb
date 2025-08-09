-- Add CreditRole to EntityType enum safely
-- Uses DO...IF NOT EXISTS pattern to ensure idempotent execution
DO
$$
BEGIN
-- Check if CreditRole already exists in EntityType enum
IF NOT EXISTS (
  SELECT
    1
  FROM
    pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
  WHERE
    t.typname = 'EntityType'
    AND e.enumlabel = 'CreditRole'
) THEN
-- Add CreditRole to the EntityType enum
ALTER TYPE "public"."EntityType"
ADD
  VALUE 'CreditRole';

END IF;

END
$$;
