import { eq, sql } from "drizzle-orm"
import { type EntityType } from "~/database/queue/typebox"
import { queue_table } from "~/database/schema"
import { type DB } from "~/service/database/connection"
import { UserModel } from "./user"

export class QueueModel {
  constructor(private db: DB) {}

  async create<T>(data: {
    author: number
    entity_id: number
    entity_type: EntityType
    old_data: T
    new_data: T
  }) {
    return await this.db.insert(queue_table).values({
      ...data,
      new_data: [data],
    })
  }

  async update({ id, new_data }: { id: number; new_data: unknown }) {
    return await this.db
      .update(queue_table)
      .set({
        new_data: sql`${queue_table.new_data} || ${new_data})`,
      })
      .where(eq(queue_table.id, id))
  }

  async merge(opt: { id: number; user_id: number }) {
    const is_moderator = await new UserModel(this.db).checkRole(
      opt.user_id,
      "any of",
      ["Admin", "Moderator"],
    )
    if (!is_moderator) return
  }
}
