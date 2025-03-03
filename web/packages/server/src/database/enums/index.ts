import { type UnionToTuple } from "@touhouclouddb/utils"
import { pgEnum } from "drizzle-orm/pg-core"

export const date_precision = pgEnum("date_precision", [
  "Year",
  "Month",
  "Day",
] as const)
export type DatePrecision = (typeof date_precision.enumValues)[number]
export type DatePrecisionTuple = UnionToTuple<DatePrecision>

export type VoteLevel = (typeof vote_level.enumValues)[number]
export const vote_level = pgEnum("vote_level", ["Boolean", "Tiered"])
export type VoteLevelTuple = UnionToTuple<VoteLevel>
