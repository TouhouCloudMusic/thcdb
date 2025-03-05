import { type lang } from "@touhouclouddb/database/interfaces"
import * as v from "valibot"

export const localizedLanguageArray: lang.Language[] = [
  "English",
  "Chinese",
  "Japanese",
  "Romanized",
]

export const LocalizedLanguageSchema = v.picklist(
  localizedLanguageArray,
  "Invalid language",
)
export type LocalizedLanguage = v.InferInput<typeof LocalizedLanguageSchema>

if (import.meta.vitest) {
  const { attest } = await import("@ark/attest")
  const { test } = import.meta.vitest
  test("match database type", () => {
    attest<LocalizedLanguage>(localizedLanguageArray[0])
  })
}
