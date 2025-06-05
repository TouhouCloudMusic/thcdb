ALTER TABLE
  group_member RENAME TO artist_membership;

ALTER TABLE
  group_member_history RENAME TO artist_membership_history;

--
ALTER TABLE
  group_member_join_leave RENAME TO artist_membership_tenure;

ALTER TABLE
  artist_membership_tenure RENAME COLUMN group_member_id TO membership_id;

--
ALTER TABLE
  group_member_join_leave_history RENAME TO artist_membership_tenure_history;

ALTER TABLE
  artist_membership_tenure_history RENAME COLUMN group_member_history_id TO membership_history_id;

--
ALTER TABLE
  group_member_role RENAME TO artist_membership_role;

ALTER TABLE
  artist_membership_role RENAME COLUMN group_member_id TO membership_id;

--
ALTER TABLE
  group_member_role_history RENAME TO artist_membership_role_history;

ALTER TABLE
  artist_membership_role_history RENAME COLUMN group_member_history_id TO membership_history_id;
