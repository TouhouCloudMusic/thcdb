import { eq, type SQL, sql } from "drizzle-orm"
import { Effect } from "effect"
import Elysia, { t } from "elysia"
import {
  type NewUser,
  role_table,
  type User,
  user_role_table,
  user as user_table,
} from "~/database"
import { USER_ROLE, type UserRoleUnion } from "~/database/lookup_tables/role"
import { type Session } from "~/database/user/typebox"
import { Response } from "~/lib/response"
import { ImageModel } from "~/model/image"
import { database_service } from "~/service/database"
import type { DB } from "~/service/database/connection"
import { select_user_query, select_user_with_session_query } from "../user/query"
import { user_profile_schema, type UserResult } from "../user/utils"

export class UserModel {
  constructor(private db: DB) {}
  async exist(username: string): Promise<boolean> {
    const { is_exists } = (
      await this.db.execute<{ is_exists: boolean }>(sql`
			SELECT EXISTS(
				SELECT 1
				FROM ${user_table}
				WHERE ${user_table.name} = ${username}
			) as is_exists;`)
    )[0]!
    return is_exists
  }

  existM(username: string) {
    return Effect.tryPromise({
      try: () => this.exist(username),
      catch(e) {
        console.log(e)
        return "Check user failed" as const
      },
    })
  }

  async create(data: NewUser): Promise<{ id: number }> {
    return this.db.transaction(async (tx) => {
      const new_user = (
        await tx
          .insert(user_table)
          .values(data)
          .returning({ id: user_table.id })
      )[0]!
      await tx.insert(user_role_table).values({
        user_id: new_user.id,
        role_id: USER_ROLE.User.id,
      })
      return new_user
    })
  }

  createM(data: NewUser) {
    return Effect.tryPromise({
      try: () => this.create(data),
      catch(e) {
        console.log(e)
        return "Create user failed" as const
      },
    })
  }

  async findById(id: number): Promise<UserResult | undefined> {
    return (
      await this.db
        .with(select_user_query)
        .select()
        .from(select_user_query)
        .where(eq(select_user_query.id, id))
    )[0]
  }
  findByIdM(id: number) {
    return Effect.tryPromise(() => this.findById(id))
  }

  async findByName(username: string): Promise<UserResult | undefined> {
    return (
      await this.db
        .with(select_user_query)
        .select()
        .from(select_user_query)
        .where(eq(select_user_query.name, username))
    )[0]
  }

  async findByNameWithAuthInfo(username: string): Promise<
    | {
        user: UserResult
        session: Session | null
      }
    | undefined
  > {
    const data = await this.db
      .with(select_user_with_session_query)
      .select()
      .from(select_user_with_session_query)
      .where(eq(select_user_with_session_query.name, username))

    if (!data.length) return
    const { session, ...user } = data[0]!
    return { user, session: session }
  }

  findByNameWithAuthInfoM(username: string) {
    return Effect.tryPromise({
      try: () => this.findByNameWithAuthInfo(username),
      catch(e) {
        console.log(e)
        return "Find user failed" as const
      },
    })
  }

  async updateAvatar({
    user_id,
    image_id,
  }: {
    user_id: number
    image_id: number
  }): Promise<void> {
    const current_avatar_id = await this.db.query.user
      .findFirst({
        where: (fields, op) => op.eq(fields.id, user_id),
        columns: { avatar_id: true },
      })
      .then((x) => x?.avatar_id)

    if (current_avatar_id) {
      await new ImageModel().deleteByID(current_avatar_id)
    }

    await this.db
      .update(user_table)
      .set({ avatar_id: image_id })
      .where(eq(user_table.id, user_id))
  }

  async removeAvatar(user: User): Promise<void> {
    if (user.avatar_id) {
      await new ImageModel().deleteByID(user.avatar_id)
    } else {
      throw new Error("User has no avatar")
    }
  }

  async checkRole(
    user_id: number,
    type: "any of" | "all of",
    roles: UserRoleUnion[],
  ): Promise<boolean> {
    let logical_sql: SQL

    if (type === "any of") {
      logical_sql = sql`AND ${role_table.name} IN ${roles}`
    } else {
      const array_expr = sql.raw(
        `ARRAY[${roles.map((x) => `'${x}'`).join(",")}]`,
      )
      logical_sql = sql`HAVING ARRAY_AGG(${role_table.name}) @> ${array_expr}`
    }

    const { has_role } = (
      await this.db.execute<{ has_role: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1
        FROM ${user_role_table}
        JOIN ${role_table} ON ${user_role_table.role_id} = ${role_table.id}
        WHERE ${user_role_table.user_id} = ${user_id}
        ${logical_sql}
      ) AS has_role;`)
    )[0]!

    return has_role
  }
}

export const user_model = new Elysia({
  name: "Model::User",
})
  .use(database_service)
  .decorate(({ db }) => ({
    UserModel: new UserModel(db),
  }))
  .model({
    "user::avatar::get": t.File(),
    "user::avatar::post": t.Object({
      data: t.File(),
    }),
    "user::profile": Response.ok.schema(user_profile_schema),
  })
  .as("plugin")
