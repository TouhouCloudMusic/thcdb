import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { image_table } from "./schema"

export const image_schema = createSelectSchema(image_table)
export const new_image_schema = createInsertSchema(image_table)

export type Image = typeof image_schema.static

export type NewImage = typeof new_image_schema.static
