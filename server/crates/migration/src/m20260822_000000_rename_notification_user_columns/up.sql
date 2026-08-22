ALTER TABLE "public"."notification_inbox_state"
  RENAME COLUMN "recipient_user_id" TO "recipient_id";

ALTER TABLE "public"."notification"
  RENAME COLUMN "recipient_user_id" TO "recipient_id";

ALTER TABLE "public"."notification_event"
  RENAME COLUMN "actor_user_id" TO "actor_id";

ALTER TABLE "public"."notification_entry"
  RENAME COLUMN "recipient_user_id" TO "recipient_id";

ALTER TABLE "public"."comment_thread_notification"
  RENAME COLUMN "recipient_user_id" TO "recipient_id";
