"use server"
import e from "@touhouclouddb/database"
import { type artist } from "@touhouclouddb/database/interfaces"
import { type Client } from "edgedb"
import { edgedbClient } from "~/database/server"
import { mapSeqlikeIDtoStr } from "~/database/utils/map_seq_like_id_to_seq_id"
import { type HasKey } from "~/lib/type/object"
import { type ArtistResult, type FindArtistShape } from "./type"

type DefaultArtistShape = typeof defaultArtistShape

const defaultArtistShape: NonNullable<FindArtistShape> = {
  ...e.default.Artist["*"],
  member_of: true,
  members: true,
  alias: true,
  release: true,
  song: true,
}

export function findArtistBySeqID<
  T extends FindArtistShape = DefaultArtistShape,
>(
  id: bigint | number | string,
  shape: T | undefined,
  client: Client = edgedbClient,
): Promise<ArtistResult<T>> {
  return e
    .select(e.default.Artist, () => ({
      filter_single: {
        app_id: e.int64(mapSeqlikeIDtoStr(id)),
      },
      ...(shape ?? defaultArtistShape),
    }))
    .run(client) as unknown as Promise<ArtistResult<T>>
}

export function findArtistByKeyword<
  T extends artist.ArtistType,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  S extends FindArtistShape = DefaultArtistShape,
>(
  keyword: string,
  type: T | undefined,
  shape: S | undefined,
  client: Client = edgedbClient,
  limit = 10,
) {
  type HasArtistType = HasKey<S, "artist_type">

  type ResultRaw =
    S extends undefined ? ArtistResult<DefaultArtistShape> : ArtistResult<S>

  type PersonResultRaw = Omit<ResultRaw, "members">
  type PersonResult =
    HasArtistType extends true ? PersonResultRaw & { artist_type: "Person" }
    : PersonResultRaw

  type GroupResultRaw = Omit<ResultRaw, "member_of">
  type GroupResult =
    HasArtistType extends true ? GroupResultRaw & { artist_type: "Group" }
    : GroupResultRaw

  type Result =
    T extends undefined ? ResultRaw
    : T extends "Person" ? PersonResult
    : GroupResult

  return e
    .select(e.default.Artist, (artist) => ({
      filter: e.op(
        e.op(
          e.ext.pg_trgm.word_similarity_dist(keyword, artist.name),
          "<=",
          0.5,
        ),
        "and",
        type ?
          e.op(artist.artist_type, "=", e.cast(e.artist.ArtistType, type))
        : true,
      ),
      limit: limit,
      ...(shape ?? defaultArtistShape),
    }))
    .run(client) as Promise<Result[]>
}
