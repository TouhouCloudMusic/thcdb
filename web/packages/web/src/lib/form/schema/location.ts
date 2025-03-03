import * as v from "valibot"

// # Location
export type LocationSchema = v.InferInput<typeof LocationSchema>
export const LocationSchema = v.object({
  country: v.string(),
  province: v.string(),
  city: v.string(),
})
