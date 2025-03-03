import type { Artist } from "@touhouclouddb/database/interfaces"
import type { Filter, FilterRecord } from "~/lib/type/filter"

export type FindArtistShape = FilterRecord<Artist>
export type ArtistResult<TQuery extends FindArtistShape> = Filter<
  Artist,
  TQuery
>
