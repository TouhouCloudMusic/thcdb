import type { OpenApiSchema } from ".."

// oxlint-disable-next-line export
export * from "./schema"
export * as DateWithPrecision from "./__internal/date_with_prec"

export type Pagination = {
	cursor: number
	limit: number
}

export type Paginated<T> = Omit<
	OpenApiSchema["Paginated_Discography"],
	"items"
> & {
	items: T[]
}
