"use server"

import { cache, redirect } from "@solidjs/router"
import e from "@touhouclouddb/database"
import { edgedbClient } from "~/database/server"

export type ArtistByID_ArtistProfile = Awaited<
  ReturnType<typeof findArtistBySeqID_ArtistProfile>
>
function findArtistBySeqID_ArtistProfile(id: string) {
  return e
    .select(e.default.Artist, (artist) => ({
      filter_single: {
        app_id: e.int64(id),
      },
      ...artist["*"],
      members: (m) => ({
        ...m["*"],
      }),
      member_of: (m) => ({
        ...m["*"],
      }),
      release: (r) => ({
        ...r["*"],
      }),
      song: (s) => ({
        ...s["*"],
      }),
    }))
    .run(edgedbClient)
}

export const getArtistProfileDataCache = cache(async (id: string) => {
  const res = await findArtistBySeqID_ArtistProfile(id)
  if (!res) throw redirect("/404")
  return res
}, "artist_data")
