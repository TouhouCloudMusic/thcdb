import Elysia, { t } from "elysia"
import { mapValues } from "radash"
import { artist_schema, new_artist_schema } from "~/database/artist/typebox"
import { Response } from "~/lib/response"

export const artist_dto = new Elysia({
  name: "Dto::Artist",
})
  .model({
    "artist::find_by_id": artist_schema,
    "artist::find_by_keyword": t.Array(artist_schema),
  })
  .model((model) => mapValues(model, (x) => Response.ok.schema(x)))
  .model({
    "artist::create": new_artist_schema,
    "artist::update": new_artist_schema,
  })
  .as("plugin")
