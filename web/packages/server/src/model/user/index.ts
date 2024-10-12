import { HashedString } from "@touhouclouddb/utils"
import { sql } from "drizzle-orm"
import { Effect, identity } from "effect"
import type { NewUser } from "~/database"
import { user } from "~/database/schema"
import { db } from "~/service/database"

export abstract class UserModel {
  static async exist(username: string) {
    let res = await db.execute<{ is_exists: boolean }>(sql`
			SELECT EXISTS(
				SELECT 1
				FROM ${user}
				WHERE ${user.name} = ${username}
			) as is_exists;`)

    return res[0].is_exists
  }

  static existM(username: string) {
    return Effect.tryPromise({
      try: () => this.exist(username),
      catch: () => "Check user failed" as const,
    })
  }

  static async insert(data: NewUser) {
    return (await db.insert(user).values(data).returning()).at(0)!
  }

  static insertM(data: NewUser) {
    return Effect.tryPromise({
      try: () => this.insert(data),
      catch: identity,
    }).pipe(Effect.mapError(() => "Insert user failed" as const))
  }
  static async findByName(username: string) {
    return await db.query.user.findFirst({
      where: (fields, op) => op.eq(fields.name, username),
    })
  }

  static async findByNameWithSession(username: string) {
    return await db.query.user.findFirst({
      where: (fields, op) => op.eq(fields.name, username),
      with: { session: true },
    })
  }
}
