ALTER TABLE "public"."artist_membership_role"
  DROP CONSTRAINT group_member_role_group_member_id_fkey,
  ADD CONSTRAINT group_member_role_group_member_id_fkey
    FOREIGN KEY ("membership_id") REFERENCES "public"."artist_membership" ("id")
    ON DELETE CASCADE;

ALTER TABLE "public"."artist_membership_tenure"
  DROP CONSTRAINT group_member_join_leave_group_member_id_fkey,
  ADD CONSTRAINT group_member_join_leave_group_member_id_fkey
    FOREIGN KEY ("membership_id") REFERENCES "public"."artist_membership" ("id")
    ON DELETE CASCADE;
