import { date, lang } from "@touhouclouddb/database/interfaces"
import { t, TSchema } from "elysia"

const localized_langs = [
  "Chinese",
  "English",
  "Japanese",
  "Romanized",
] as const satisfies lang.Language[]

const date_masks = ["Full", "YM", "Y"] as const satisfies date.FormatMask[]

export const Schema = {
  id: t.Number(
    t.Integer({
      minimum: 1,
      error: "Invalid ID",
    }),
  ),
  name: t.String({
    minLength: 1,
    maxLength: 127,
    error: "Invalid name",
  }),
  title: t.String({
    minLength: 1,
    maxLength: 127,
    error: "Invalid title",
  }),
  language: t.UnionEnum(localized_langs, {
    error: "Invalid language",
    default: undefined,
  }),
  date_mask: t.UnionEnum(date_masks, {
    error: "Invalid date mask",
    default: undefined,
  }),
  location: t.Object({
    country: t.String(),
    province: t.String(),
    city: t.String(),
  }),
  err: t.Object({
    state: t.Literal("error"),
    message: t.String(),
  }),
  ok<T extends TSchema>(schema: T) {
    return t.Object({
      state: t.Literal("success"),
      data: schema,
    })
  },
}
