import { type HashedString } from "@touhouclouddb/utils"
import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { t } from "elysia"
import { image_schema } from "../image/typebox"
import { role_table, session, user } from "./schema"

export const user_schema = createSelectSchema(user)
export type User = typeof user_schema.static

export const user_role_schema = createSelectSchema(role_table)
export type UserRole = typeof user_role_schema.static

export const session_schema = createSelectSchema(session)
export type Session = typeof session_schema.static

export const user_links_schema = t.Object({
  avatar: t.Nullable(image_schema),
  role: t.Nullable(t.Array(user_role_schema)),
  session: t.Nullable(session_schema),
})
export type UserLinks = typeof user_links_schema.static

export const new_user_schema = t.Omit(
  // @ts-ignore
  createInsertSchema(user),
  ["id", "created_at", "updated_at"],
)
export type NewUser = typeof new_user_schema.static & {
  password: HashedString
}
