ALTER TABLE
  "user"
  DROP CONSTRAINT fk_user_avatar_id_image_id;

ALTER TABLE
  "user"
  DROP CONSTRAINT fk_user_profile_banner_id_image_id;

ALTER TABLE
  "user"
ADD
  CONSTRAINT user_avatar_id_fkey FOREIGN KEY (avatar_id) REFERENCES image(id);

ALTER TABLE
  "user"
ADD
  CONSTRAINT user_profile_banner_id_fkey FOREIGN KEY (profile_banner_id) REFERENCES image(id);
