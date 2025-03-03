import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { type entity_type, type queue_status, queue_table, type queue_type } from "./schema"

export const queue_schema = createSelectSchema(queue_table)
export const new_queue_schema = createInsertSchema(queue_table)

export type Queue = typeof queue_schema.static
export type NewQueue = typeof new_queue_schema.static

export type QueueType = (typeof queue_type.enumValues)[number]
export type QueueStatus = (typeof queue_status.enumValues)[number]

export type EntityType = (typeof entity_type.enumValues)[number]
