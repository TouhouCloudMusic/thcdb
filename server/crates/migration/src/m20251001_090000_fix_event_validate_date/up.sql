ALTER TABLE
  "public"."event"
  DROP CONSTRAINT "validate_date",
ADD
  CONSTRAINT "validate_date" CHECK (
    end_date IS NULL
    OR (
      start_date IS NOT NULL
      AND end_date > start_date
    )
  );

ALTER TABLE
  "public"."event_history"
  DROP CONSTRAINT "validate_date",
ADD
  CONSTRAINT "validate_date" CHECK (
    end_date IS NULL
    OR (
      start_date IS NOT NULL
      AND end_date > start_date
    )
  );
