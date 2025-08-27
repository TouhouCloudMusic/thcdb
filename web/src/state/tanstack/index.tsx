// oxlint-disable no-magic-numbers
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools"
import type { ParentProps } from "solid-js"

export const QUERY_CLIENT = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 min
			gcTime: 1000 * 60 * 60 * 24, // 24 hrs,
			experimental_prefetchInRender: true,
		},
	},
})

export function TanStackProvider(props: ParentProps) {
	return (
		<QueryClientProvider client={QUERY_CLIENT}>
			<SolidQueryDevtools initialIsOpen={false} />
			{props.children}
		</QueryClientProvider>
	)
}
