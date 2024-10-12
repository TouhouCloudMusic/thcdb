import Elysia from "elysia"
import { Schema } from "~/lib/schema"

export const error_model = new Elysia().model({
  error: Schema.err,
})
