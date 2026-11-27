import type {
	InfiniteData,
	UseInfiniteQueryResult,
} from "@tanstack/solid-query"

import { ready } from "~/type/asyncData"
import type { AsyncData } from "~/type/asyncData"

export type InfiniteQueryPagination =
	| { kind: "more"; load: () => void }
	| { kind: "fetching" }
	| { kind: "fetch-next-error"; retry: () => void }
	| { kind: "refreshing" }
	| { kind: "refresh-error"; retry: () => void }
	| { kind: "end" }

export type InfiniteQueryState<Item> = AsyncData<
	{ items: Item[]; pagination: InfiniteQueryPagination },
	{ retry: () => void }
>

function pagination<Data, Error>(
	query: UseInfiniteQueryResult<Data, Error>,
): InfiniteQueryPagination {
	if (query.isFetchingNextPage) return { kind: "fetching" }
	if (query.fetchStatus !== "idle") return { kind: "refreshing" }
	if (query.isFetchNextPageError) {
		return { kind: "fetch-next-error", retry: () => void query.fetchNextPage() }
	}
	if (query.isRefetchError) {
		return { kind: "refresh-error", retry: () => void query.refetch() }
	}
	if (query.hasNextPage) {
		return { kind: "more", load: () => void query.fetchNextPage() }
	}
	return { kind: "end" }
}

export function infiniteQueryState<Page, Error, Item>(
	query: UseInfiniteQueryResult<InfiniteData<Page>, Error>,
	selectItems: (page: Page) => readonly Item[],
): InfiniteQueryState<Item> {
	const data = query.data
	if (data === undefined) {
		if (query.status === "error" && query.fetchStatus === "idle") {
			return { kind: "error", retry: () => void query.refetch() }
		}
		return { kind: "loading" }
	}

	return ready({
		items: data.pages.flatMap(selectItems),
		pagination: pagination(query),
	})
}
