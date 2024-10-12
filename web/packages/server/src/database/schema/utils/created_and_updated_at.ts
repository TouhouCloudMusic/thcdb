import { timestamp } from "drizzle-orm/pg-core"

export const created_at = {
  created_at: timestamp("created_at", { precision: 6, withTimezone: true })
    .notNull()
    .defaultNow(),
}

export const updated_at = {
  updated_at: timestamp("updated_at", { precision: 6, withTimezone: true })
    .notNull()
    .defaultNow(),
}

export const created_and_updated_at = {
  ...created_at,
  ...updated_at,
}
