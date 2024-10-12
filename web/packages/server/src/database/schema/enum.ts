import { pgEnum } from "drizzle-orm/pg-core"

export type DatePrecision = (typeof date_precision.enumValues)[number]
export const date_precision = pgEnum("date_precision", [
  "Year",
  "Month",
  "Day",
] as const)

export type VoteLevel = (typeof vote_level.enumValues)[number]
export const vote_level = pgEnum("vote_level", ["Boolean", "Tiered"])
