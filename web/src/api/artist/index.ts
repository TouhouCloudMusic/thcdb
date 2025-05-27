import type { OpenApiSchema } from ".."

export * as ArtistMutation from "./mutation"
export * as ArtistQueryOption from "./query"

export type Artist = OpenApiSchema["Artist"]
export type ArtistRelease =
	OpenApiSchema["Paginated_ArtistRelease"]["items"][number]
