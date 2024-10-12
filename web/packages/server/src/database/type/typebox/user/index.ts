import { HashedString } from "@touhouclouddb/utils"
import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { t } from "elysia"
import { session, user } from "~/database/schema"

export type User = typeof user_schema.static
export const user_schema = createSelectSchema(user)

export type NewUser = typeof new_user_schema.static & {
  password: HashedString
}

const $new_user = createInsertSchema(user)
export const new_user_schema = t.Pick($new_user, ["name", "password", "email"])
export type Session = typeof session_schema.static
export const session_schema = createSelectSchema(session)
