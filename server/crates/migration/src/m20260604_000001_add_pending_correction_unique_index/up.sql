DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."correction"
    WHERE "status" = 'Pending'
    GROUP BY
      "entity_type",
      "entity_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate pending corrections must be resolved before creating uq_correction_pending_entity';
  END IF;
END;
$$;

CREATE UNIQUE INDEX "uq_correction_pending_entity"
ON "public"."correction" (
  "entity_type",
  "entity_id"
)
WHERE "status" = 'Pending';
