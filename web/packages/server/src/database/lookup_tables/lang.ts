import { type Succ } from "@touhouclouddb/utils"

export const enum Languages {
  Chinese = 1,
  English = 2,
  Japanese = 3,
  Romanized = 4,
}

export const LANGUAGE_ARRAY = [
  "Chinese",
  "English",
  "Japanese",
  "Romanized",
] as const
export const LANGUAGES = LANGUAGE_ARRAY.map((name, index) => ({
  id: ++index,
  name,
})) as Language

type LanguageArray = typeof LANGUAGE_ARRAY
type Language<Acc extends unknown[] = [], Prev extends unknown[] = []> =
  Acc["length"] extends LanguageArray["length"] ? Prev
  : Language<
      [...Acc, unknown],
      [
        ...Prev,
        {
          id: Succ<Acc["length"]>
          name: LanguageArray[Acc["length"]]
        },
      ]
    >
