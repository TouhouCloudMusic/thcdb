CREATE TYPE "public"."JoinYearType" AS ENUM('FoundingMember', 'Specific');

CREATE TYPE "public"."LeaveYearType" AS ENUM('Unknown', 'Specific');

ALTER TABLE
  "public"."group_member_join_leave"
ADD
  COLUMN "join_year_type" "public"."JoinYearType" NOT NULL,
ADD
  COLUMN "leave_year_type" "public"."LeaveYearType" NOT NULL,
ADD
  CONSTRAINT "join_year_type_check" CHECK (
    (
      join_year_type = 'FoundingMember' :: public."JoinYearType"
    )
    AND (join_year IS NULL)
  ),
ADD
  CONSTRAINT "leave_year_type_check" CHECK (
    (
      leave_year_type = 'Unknown' :: public."LeaveYearType"
    )
    AND (leave_year IS NULL)
  );

ALTER TABLE
  "public"."group_member_join_leave_history"
ADD
  COLUMN "join_year_type" "public"."JoinYearType" NOT NULL,
ADD
  COLUMN "leave_year_type" "public"."LeaveYearType" NOT NULL,
ADD
  CONSTRAINT "join_year_type_check" CHECK (
    (
      join_year_type = 'FoundingMember' :: public."JoinYearType"
    )
    AND (join_year IS NULL)
  ),
ADD
  CONSTRAINT "leave_year_type_check" CHECK (
    (
      leave_year_type = 'Unknown' :: public."LeaveYearType"
    )
    AND (leave_year IS NULL)
  );
