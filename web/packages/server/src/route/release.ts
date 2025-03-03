import Elysia, { t } from "elysia"
import { new_release_schema } from "~/database/release/typebox"
import { Response } from "~/lib/response"
import { SchemaHelper } from "~/lib/response/schema"
import { ReleaseModel } from "~/model/release"
import { auth_guard } from "~/service/user"

export const release_router = new Elysia({ prefix: "/release" })
  .decorate("model", new ReleaseModel())
  .group(
    "/:id",
    {
      params: t.Object({
        id: SchemaHelper.id,
      }),
    },
    (router) =>
      router.get("", async ({ model, params: { id } }) => {
        const result = await model.findByID(id)
        if (!result) return Response.notFound("Release Not Found")
        return Response.ok(result)
      }),
  )
  .use(auth_guard)
  .post(
    "",
    async ({ model, body }) => {
      try {
        const result = await model.create(body)
        return Response.ok(result)
      } catch (err) {
        return Response.err(500, err)
      }
    },
    {
      body: new_release_schema,
    },
  )
