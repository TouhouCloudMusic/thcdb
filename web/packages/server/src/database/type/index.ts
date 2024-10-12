import { localization_language } from "~/database/schema"

export type * from "../schema"
export type * from "./typebox"

export type LocalizationLanguage =
  (typeof localization_language.enumValues)[number]
