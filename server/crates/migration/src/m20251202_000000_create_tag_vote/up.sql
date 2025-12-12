CREATE TABLE "public"."release_tag_vote" (
  "release_id" INT NOT NULL REFERENCES public.release(id),
  "tag_id" INT NOT NULL REFERENCES public.tag(id),
  "user_id" INT NOT NULL REFERENCES public.user(id),
  "score" SMALLINT NOT NULL CHECK (score IN (-3, 1, 2, 3)),
  "voted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (release_id, tag_id, user_id)
);

CREATE INDEX idx_release_tag_vote_tag_id ON release_tag_vote(tag_id);

CREATE INDEX idx_release_tag_vote_user_id ON release_tag_vote(user_id);

CREATE TABLE "public"."song_tag_vote" (
  "song_id" INT NOT NULL REFERENCES public.song(id),
  "tag_id" INT NOT NULL REFERENCES public.tag(id),
  "user_id" INT NOT NULL REFERENCES public.user(id),
  "score" SMALLINT NOT NULL CHECK (score IN (-3, 1, 2, 3)),
  "voted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (song_id, tag_id, user_id)
);

CREATE INDEX idx_song_tag_vote_tag_id ON song_tag_vote(tag_id);

CREATE INDEX idx_song_tag_vote_user_id ON song_tag_vote(user_id);

CREATE TABLE "public"."artist_tag_vote" (
  "artist_id" INT NOT NULL REFERENCES public.artist(id),
  "tag_id" INT NOT NULL REFERENCES public.tag(id),
  "user_id" INT NOT NULL REFERENCES public.user(id),
  "score" SMALLINT NOT NULL CHECK (score IN (-3, 1, 2, 3)),
  "voted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (artist_id, tag_id, user_id)
);

CREATE INDEX idx_artist_tag_vote_tag_id ON artist_tag_vote(tag_id);

CREATE INDEX idx_artist_tag_vote_user_id ON artist_tag_vote(user_id);
