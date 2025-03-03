import Elysia, { t } from "elysia"
import { artist_model } from "~/artist/model"
import { Response } from "~/lib/response"
import { SchemaHelper } from "~/lib/response/schema"
import { auth_guard } from "~/service/user"
import { artist_dto } from "./dto"
export const artist_controller = new Elysia({ prefix: "/artist" })
  .use(artist_model)
  .use(artist_dto)
  .get(
    "",
    async ({ ArtistModel, query: { keyword, limit } }) => {
      const result = await ArtistModel.findByKeyword(keyword, limit)
      if (result.length === 0) return Response.notFound("Artist Not Found")
      return Response.ok(result)
    },
    {
      query: t.Object({
        keyword: SchemaHelper.keyword,
        limit: SchemaHelper.limit(),
      }),

      response: {
        200: "artist::find_by_keyword",
        404: Response.err.schema,
      },
    },
  )
  .group(
    "/:id",
    {
      params: t.Object({
        id: SchemaHelper.id,
      }),
    },
    (router) =>
      router
        .get(
          "",
          async ({ ArtistModel, params: { id } }) => {
            const res = await ArtistModel.findByID(id)
            return !res ?
                Response.notFound("Artist Not Found")
              : Response.ok(res)
          },
          {
            response: {
              200: "artist::find_by_id",
              404: Response.err.schema,
            },
          },
        )
        .use(auth_guard)
        .post(
          "",
          async ({ ArtistModel, body, params: { id }, store: { session } }) => {
            return ArtistModel.createPullRequest({
              artist_data: body,
              artist_id: id,
              author_id: session.user_id,
            })
          },
          {
            body: "artist::update",
          },
        ),
  )
  .use(auth_guard)
  .post(
    "",
    async ({ ArtistModel, body }) => {
      return ArtistModel.create(body)
    },
    {
      body: "artist::create",
    },
  )
