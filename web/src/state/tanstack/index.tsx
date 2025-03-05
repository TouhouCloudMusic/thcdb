import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools"
import { createSignal, type ParentProps } from "solid-js"

export function TanStackProvider(props: ParentProps) {
  const [queryClinet] = createSignal(
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 min
          gcTime: 1000 * 60 * 60 * 24, // 24 hrs
        },
      },
    }),
  )
  return (
    <QueryClientProvider client={queryClinet()}>
      <SolidQueryDevtools initialIsOpen={false} />
      {props.children}
    </QueryClientProvider>
  )
}
