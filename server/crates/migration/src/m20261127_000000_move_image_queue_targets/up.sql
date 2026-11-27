-- The PostgreSQL migrator holds these locks until it commits or rolls back.
LOCK TABLE public.image_queue, public.artist_image_queue, public.release_image_queue
    IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
    invalid RECORD;
BEGIN
    IF enum_range(NULL::public."ArtistImageType") IS DISTINCT FROM
        ARRAY['Profile'::public."ArtistImageType"]
        OR enum_range(NULL::public.release_image_type) IS DISTINCT FROM
        ARRAY['Cover'::public.release_image_type]
    THEN
        RAISE EXCEPTION 'Cannot make image queue types implicit: expected only ArtistImageType.Profile and release_image_type.Cover';
    END IF;

    SELECT q.id AS queue_id,
           count(t.queue_id) AS target_count,
           count(*) FILTER (WHERE t.kind = 'artist') AS artist_count,
           count(*) FILTER (WHERE t.kind = 'release') AS release_count
    INTO invalid
    FROM public.image_queue AS q
    LEFT JOIN (
        SELECT queue_id, 'artist' AS kind FROM public.artist_image_queue
        UNION ALL
        SELECT queue_id, 'release' AS kind FROM public.release_image_queue
    ) AS t ON t.queue_id = q.id
    GROUP BY q.id
    HAVING count(t.queue_id) <> 1
    ORDER BY q.id
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'image_queue id % has % targets (artist: %, release: %); expected exactly one',
            invalid.queue_id, invalid.target_count, invalid.artist_count, invalid.release_count;
    END IF;
END
$$;

ALTER TABLE public.image_queue
    ADD COLUMN artist_id INTEGER REFERENCES public.artist (id),
    ADD COLUMN release_id INTEGER REFERENCES public.release (id);

UPDATE public.image_queue AS q
SET artist_id = t.artist_id
FROM public.artist_image_queue AS t
WHERE t.queue_id = q.id;

UPDATE public.image_queue AS q
SET release_id = t.release_id
FROM public.release_image_queue AS t
WHERE t.queue_id = q.id;

ALTER TABLE public.image_queue
    ADD CONSTRAINT image_queue_exactly_one_target
    CHECK ((artist_id IS NOT NULL) <> (release_id IS NOT NULL));

CREATE INDEX image_queue_artist_id_idx ON public.image_queue (artist_id)
    WHERE artist_id IS NOT NULL;
CREATE INDEX image_queue_release_id_idx ON public.image_queue (release_id)
    WHERE release_id IS NOT NULL;

DROP TABLE public.artist_image_queue, public.release_image_queue;
