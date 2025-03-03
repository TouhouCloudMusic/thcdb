import { type TableConfig } from "drizzle-orm"
import { integer, type PgTableWithColumns, real, varchar } from "drizzle-orm/pg-core"
import { artist } from "~/database/artist/schema"
import { user } from "~/database/user/schema"
import { vote_level } from "../enums"
import { credit_role } from "../music/schema"
import { created_and_updated_at } from "./created_and_updated_at"

export type OmitCreatedAndUpdatedAt<T> = Omit<T, "created_at" | "updated_at">

/**
 * Automatically generated columns that credit table needs:
 * - id
 * - artist id
 * - musci role id
 * - display name
 */
export const credit_cons = () => ({
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  artist_id: integer("artist_id")
    .references(() => artist.id)
    .notNull(),
  role_id: integer("role_id")
    .references(() => credit_role.id)
    .notNull(),
  display_name: varchar("display_name", { length: 128 }),
  ...created_and_updated_at,
})

export const vote_cons = <T extends TableConfig>(
  target: PgTableWithColumns<T>,
) => ({
  voter_id: integer("voter_id")
    .references(() => user.id)
    .notNull(),
  target_id: integer("target_id")
    .references(() => target.id)
    .notNull(),
  vote_level: vote_level("vote_level").notNull(),
  vote_value: real("vote_value").notNull(),
})
