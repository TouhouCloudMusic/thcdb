import Elysia, { t } from "elysia"
import { Schema } from "~/lib/schema"

export const util_plugin = new Elysia({ name: "Plugin.Util" }).model({
  "params:id": t.Object({
    id: Schema.id,
  }),
  "query:keyword_with_limit": t.Object({
    keyword: t
      .Transform(
        t.String({
          minLength: 1,
          maxLength: 32,
        }),
      )
      .Decode((v) => v.trim())
      .Encode((v) => v.trim()),
    limit: t.Number(
      t.Integer({
        minimum: 1,
        maximum: 100,
        default: 10,
      }),
    ),
  }),
})
