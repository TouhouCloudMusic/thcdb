CREATE TABLE "public"."user_following" (
  "user_id" INT NOT NULL REFERENCES public.user(id),
  "following_id" INT NOT NULL REFERENCES public.user(id),
  "following_at" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, following_id),
  CHECK (user_id <> following_id)
);
