import * as v from "valibot"

export const OptionalIDSchema = v.optional(v.pipe(v.string(), v.uuid()))

export const OptionalAppIDSchema = v.optional(v.pipe(v.number(), v.integer()))
