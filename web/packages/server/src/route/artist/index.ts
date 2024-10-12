import Elysia from "elysia"
import { Response } from "~/lib/response"
import { artist_model } from "~/model/artist"
import { error_model } from "~/model/error"
import { util_plugin } from "~/plugin"
import { auth_service } from "~/service/user"
export const artist_router = new Elysia({ prefix: "/artist" })
  .use(error_model)
  .use(artist_model)
  .use(util_plugin)
  .use(auth_service)
  .get(
    "",
    async ({ artist, query: { keyword, limit } }) => {
      let result = await artist.findByKeyword(keyword, limit)
      if (result.length === 0) return Response.notFound("Artist Not Found")
      return Response.ok(result)
    },
    {
      query: "query:keyword_with_limit",
      response: {
        200: "artist::find_by_keyword",
        404: "error",
      },
    },
  )
  .post(
    "",
    async ({ artist, body }) => {
      return artist.insert(body)
    },
    {
      body: "artist::new",
    },
  )
  .group(
    "/:id",
    {
      params: "params:id",
    },
    ($) =>
      $.get(
        "",
        async ({ artist, params: { id } }) => {
          let res = await artist.findByID(id)
          return !res ? Response.notFound("Artist Not Found") : Response.ok(res)
        },
        {
          response: {
            200: "artist::find_by_id",
            404: "error",
          },
        },
      ),
  )
