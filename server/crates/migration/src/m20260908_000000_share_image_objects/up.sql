ALTER TABLE public.image ADD COLUMN object_key TEXT;
UPDATE public.image
SET object_key = concat_ws(
    '/',
    NULLIF(rtrim(directory, '/'), ''),
    filename);

ALTER TABLE public.image
  DROP COLUMN directory,
  DROP COLUMN filename,
  ALTER COLUMN object_key SET NOT NULL,
  ADD COLUMN unreferenced_since TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX image_object_key_idx ON public.image (backend, object_key);
CREATE INDEX image_unreferenced_since_idx ON public.image (unreferenced_since)
  WHERE unreferenced_since IS NOT NULL;

ALTER TABLE public.image_queue DROP CONSTRAINT image_queue_image_id_null_check;

CREATE INDEX user_avatar_id_idx ON public."user" (avatar_id);
CREATE INDEX user_profile_banner_id_idx ON public."user" (profile_banner_id);
CREATE INDEX image_queue_image_id_idx ON public.image_queue (image_id);
CREATE INDEX artist_image_image_id_idx ON public.artist_image (image_id);
CREATE INDEX release_image_image_id_idx ON public.release_image (image_id);

CREATE FUNCTION public.image_is_referenced(target_image_id INTEGER) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."user"
    WHERE avatar_id = target_image_id
       OR profile_banner_id = target_image_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.image_queue
    WHERE image_id = target_image_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.artist_image
    WHERE image_id = target_image_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.release_image
    WHERE image_id = target_image_id
  );
$$;

UPDATE public.image SET unreferenced_since = NULL WHERE public.image_is_referenced(id);

CREATE FUNCTION public.refresh_image_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_image_ids INTEGER[];
  image_id INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'user' THEN
    affected_image_ids := ARRAY[
      OLD.avatar_id,
      NEW.avatar_id,
      OLD.profile_banner_id,
      NEW.profile_banner_id
    ];
  ELSE
    affected_image_ids := ARRAY[
      OLD.image_id,
      NEW.image_id
    ];
  END IF;

  FOR image_id IN
    SELECT DISTINCT affected_id
    FROM unnest(affected_image_ids) AS affected(affected_id)
    WHERE affected_id IS NOT NULL
    ORDER BY affected_id
  LOOP
    PERFORM 1
    FROM public.image
    WHERE id = image_id
    FOR NO KEY UPDATE;

    UPDATE public.image
    SET unreferenced_since = CASE
      WHEN public.image_is_referenced(image_id) THEN NULL
      ELSE COALESCE(unreferenced_since, clock_timestamp())
    END
    WHERE id = image_id;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE TRIGGER user_image_retention
AFTER INSERT OR DELETE OR UPDATE OF avatar_id, profile_banner_id ON public."user"
FOR EACH ROW EXECUTE FUNCTION public.refresh_image_retention();

CREATE TRIGGER queue_image_retention
AFTER INSERT OR DELETE OR UPDATE OF image_id ON public.image_queue
FOR EACH ROW EXECUTE FUNCTION public.refresh_image_retention();

CREATE TRIGGER artist_image_retention
AFTER INSERT OR DELETE OR UPDATE OF image_id ON public.artist_image
FOR EACH ROW EXECUTE FUNCTION public.refresh_image_retention();

CREATE TRIGGER release_image_retention
AFTER INSERT OR DELETE OR UPDATE OF image_id ON public.release_image
FOR EACH ROW EXECUTE FUNCTION public.refresh_image_retention();
