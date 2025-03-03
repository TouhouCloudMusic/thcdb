import Elysia from "elysia"
import { db } from "./connection"

export const database_service = new Elysia({ name: "Service::Database" })
  .decorate("db", db)
  .as("plugin")
