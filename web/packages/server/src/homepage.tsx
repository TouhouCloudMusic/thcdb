import { Html } from "@elysiajs/html"
import Elysia from "elysia"

export const Hello = new Elysia().get("/", () => (
  <html lang="en">
    <head>
      <title>Hello World</title>
    </head>
    <body>
      <h1>Hello World</h1>
      <a href="/docs">Swagger Doc</a>
    </body>
  </html>
))
