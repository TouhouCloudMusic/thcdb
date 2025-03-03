import Elysia, { t } from "elysia"
import { new_song_schema, song_schema } from "~/database/song/typebox"
import { Response } from "~/lib/response"
import { SchemaHelper } from "~/lib/response/schema"
import { SongModel } from "~/model/song"
import { database_service } from "~/service/database"
import { auth_guard } from "~/service/user"

export const song_router = new Elysia({ prefix: "/song" })
  .use(database_service)
  .derive(({ db }) => ({ SongModel: new SongModel(db) }))
  .group(
    "/:id",
    {
      params: t.Object({
        id: SchemaHelper.id,
      }),
    },
    (router) =>
      router.get(
        "",
        async ({ SongModel, params: { id } }) => {
          const result = await SongModel.findByID(id)
          if (!result) return Response.notFound("Song Not Found")
          return Response.ok(result)
        },
        {
          response: {
            200: Response.ok.schema(new_song_schema),
            404: Response.err.schema,
          },
        },
      ),
  )
  .get(
    "/random",
    async ({ SongModel, params }) => {
      const result = await SongModel.random(params.count)
      return Response.ok(result)
    },
    {
      params: t.Object({
        count: t.Number({ minimum: 1, maximum: 20 }),
      }),
      response: Response.ok.schema(t.Array(song_schema)),
    },
  )
  .use(auth_guard)
  .post(
    "",
    async ({ SongModel, body }) => {
      const result = await SongModel.create(body)
      return Response.ok(result)
    },
    {
      body: new_song_schema,
      response: Response.ok.schema(song_schema),
    },
  )
