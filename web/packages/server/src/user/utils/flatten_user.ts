import { type AsyncReturnType, type SafeOmit } from "@touhouclouddb/utils"
import { type FindFirstQueryConfig } from "@touhouclouddb/utils/drizzle"
import { t } from "elysia"
import { type User, user_schema, type UserLinks } from "~/database/user/typebox"
import { db } from "~/service/database/connection"

export const USER_RETURN_WITH = {
  avatar: true,
  role: {
    with: {
      role: true,
    },
  },
} satisfies FindFirstQueryConfig<typeof db.query.user>["with"]

const sim_find = () =>
  db.query.user.findFirst({
    with: USER_RETURN_WITH,
  })

export type UnflattenedUser = AsyncReturnType<typeof sim_find>
export interface UserResult
  extends User,
    SafeOmit<UserLinks, "session" | "role"> {
  role: string[] | null
}

export const user_profile_schema = t.Composite([
  t.Omit(user_schema, ["id", "password", "email", "avatar_id"]),
  t.Object({
    role: t.Nullable(t.Array(t.String())),
    avatar: t.Nullable(t.String()),
  }),
])
export type UserProfile = typeof user_profile_schema.static

export function flattenUser<T extends UnflattenedUser>(
  user: T,
): T extends undefined ? undefined
: Omit<T, "role"> & {
    role: string[] | null
  }
export function flattenUser<T extends UnflattenedUser>(user: T) {
  if (user)
    return {
      ...user,
      role: user.role.map((x) => x.role.name),
    } satisfies Omit<T, "role"> & {
      role: string[] | null
    }
}
