import Elysia from "elysia"
import { SchemaHelper } from "~/lib/response/schema"

export const id_model = new Elysia().model({
  id: SchemaHelper.id,
})
export type OmitColumnFromSchema<A, B> = {
  [K in keyof A | keyof B]: true
}
