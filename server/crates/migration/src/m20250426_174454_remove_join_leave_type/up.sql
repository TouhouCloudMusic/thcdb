ALTER TABLE
  "public"."group_member_join_leave"
  DROP CONSTRAINT "join_year_type_check",
  DROP CONSTRAINT "leave_year_type_check";

ALTER TABLE
  "public"."group_member_join_leave_history"
  DROP CONSTRAINT "join_year_type_check",
  DROP CONSTRAINT "leave_year_type_check";

ALTER TABLE
  "public"."group_member_join_leave"
  DROP COLUMN "join_year_type",
  DROP COLUMN "leave_year_type";

ALTER TABLE
  "public"."group_member_join_leave_history"
  DROP COLUMN "join_year_type",
  DROP COLUMN "leave_year_type";

DROP TYPE "public"."JoinYearType";

DROP TYPE "public"."LeaveYearType";
