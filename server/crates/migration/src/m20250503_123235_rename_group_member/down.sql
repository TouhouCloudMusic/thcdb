ALTER TABLE artist_membership
RENAME TO group_member;

ALTER TABLE artist_membership_history
RENAME TO group_member_history;

--
ALTER TABLE artist_membership_tenure
RENAME COLUMN membership_id TO group_member_id;

ALTER TABLE artist_membership_tenure
RENAME TO group_member_join_leave;

--
ALTER TABLE artist_membership_tenure_history
RENAME COLUMN membership_history_id TO group_member_history_id;

ALTER TABLE artist_membership_tenure_history
RENAME TO group_member_join_leave_history;

--
ALTER TABLE artist_membership_role
RENAME COLUMN membership_id TO group_member_id;

ALTER TABLE artist_membership_role
RENAME TO group_member_role;

--
ALTER TABLE artist_membership_role_history
RENAME COLUMN membership_history_id TO group_member_history_id;

ALTER TABLE artist_membership_role_history
RENAME TO group_member_role_history;
