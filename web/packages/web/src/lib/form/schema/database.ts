import * as v from "valibot"

export type DateMask = v.InferInput<typeof DateMask> & {}

export const DateMask = v.picklist(["YMD", "YM", "Y"], "Invalid date format")
