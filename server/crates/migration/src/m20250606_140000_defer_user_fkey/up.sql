ALTER TABLE
  "user"
  DROP CONSTRAINT user_avatar_id_fkey;

ALTER TABLE
  "user"
  DROP CONSTRAINT user_profile_banner_id_fkey;

ALTER TABLE
  "user"
ADD
  CONSTRAINT fk_user_avatar_id_image_id FOREIGN KEY (avatar_id) REFERENCES image(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE
  "user"
ADD
  CONSTRAINT fk_user_profile_banner_id_image_id FOREIGN KEY (profile_banner_id) REFERENCES image(id) DEFERRABLE INITIALLY DEFERRED;
