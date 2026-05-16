ALTER TABLE "public"."user_role"
  DROP CONSTRAINT user_role_user_id_fkey;

ALTER TABLE
  "public"."user_role"
  ADD CONSTRAINT user_role_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
