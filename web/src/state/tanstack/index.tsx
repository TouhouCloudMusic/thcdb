import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools"
import { type ParentProps } from "solid-js"

export const TanstackQueryClinet = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 60 * 24, // 24 hrs
    },
  },
})

export function TanStackProvider(props: ParentProps) {
  return (
    <QueryClientProvider client={TanstackQueryClinet}>
      <SolidQueryDevtools initialIsOpen={false} />
      {props.children}
    </QueryClientProvider>
  )
}
