import type { OpenApiSchema } from "~/api"

export type Appearance =
	OpenApiSchema["DataPaginatedAppearance"]["data"]["items"][number]
export type Credit = OpenApiSchema["Paginated_Credit"]["items"][number]
export type Discography =
	OpenApiSchema["Paginated_Discography"]["items"][number]
export type InitDiscography = OpenApiSchema["InitDiscography"]
