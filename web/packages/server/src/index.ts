import cors from "@elysiajs/cors"
import { opentelemetry } from "@elysiajs/opentelemetry"
import swagger from "@elysiajs/swagger"
import { Elysia } from "elysia"
import { artist_router } from "./route/artist"
import { user_router } from "./route/user"

const app = new Elysia()
  .use(opentelemetry())
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Touhou Cloud DB",
          version: "0.1.0",
        },
      },
    }),
  )
  .use(
    cors({
      origin: false,
    }),
  )
  .onError(({ error, code }) => {
    if (code === "NOT_FOUND") return "Not Found :("
    console.log(error)
  })
  .get("/", () => "Hello Elysia")
  .use(user_router)
  .use(artist_router)
  .listen(process.env.PORT || 3456)

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
)
