import type { AsyncReturnType } from "@touhouclouddb/utils"
import type { Artist } from "~/database"
import type { ArtistLinks } from "~/database/artist/typebox"
import { db } from "~/service/database/connection"
import { RETURN_WITH } from "../model"

export type UnflattenedArtist = AsyncReturnType<typeof simulate_find>
export type FlattenedArtist = Artist & ArtistLinks
const simulate_find = () => db.query.artist.findFirst({ with: RETURN_WITH })
export function flattenArtist<T extends UnflattenedArtist>(
  artist: T,
): T extends undefined ? undefined : NonNullable<T> & FlattenedArtist
export function flattenArtist<T extends UnflattenedArtist>(artist: T) {
  if (artist)
    return {
      ...artist,
      aliases:
        artist.alias_group?.artist.filter(({ id }) => id !== artist.id) ?? [],
      release: artist.to_release_artist.map((x) => x.release),
      members: artist.to_members.map((x) => x.member),
      member_of: artist.to_member_of.map((x) => x.group),
    } satisfies NonNullable<T> & FlattenedArtist
}
