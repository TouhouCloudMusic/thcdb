import Elysia from "elysia"
import { artist_controller } from "../artist/controller"
import { release_router } from "./release"
import { song_router } from "./song"

export const api_router = new Elysia()
  .use(artist_controller)
  .use(release_router)
  .use(song_router)
