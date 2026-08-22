import {
	partialMatchKey,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/solid-query"
import type { ParentProps } from "solid-js"

export const SESSION_QUERY_KEY = ["session"] as const

export const QUERY_CLIENT = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 min
			gcTime: 1000 * 60 * 60 * 24, // 24 hrs,
			// experimental_prefetchInRender: true,
		},
	},
})

export async function resetSessionQueries() {
	QUERY_CLIENT.getMutationCache().clear()
	await QUERY_CLIENT.resetQueries()
}

export async function resetAuthorizationQueries() {
	await QUERY_CLIENT.resetQueries({
		predicate: (query) => !partialMatchKey(query.queryKey, SESSION_QUERY_KEY),
	})
}

export function TanStackProvider(props: ParentProps) {
	return (
		<QueryClientProvider client={QUERY_CLIENT}>
			{props.children}
		</QueryClientProvider>
	)
}
