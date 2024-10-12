import { pgEnum } from "drizzle-orm/pg-core"

export const localization_language = pgEnum("localization_langs", [
  "Chinese",
  "English",
  "Japanese",
  "Romanized",
])
