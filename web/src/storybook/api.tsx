import { onCleanup } from "solid-js"
import { createJSXDecorator } from "storybook-solidjs-vite"

import { FetchClient } from "../../packages/api/src/fetch"

export function withStoryApi(responses: Record<string, Response>) {
	return createJSXDecorator((Story) => {
		const middleware: Parameters<typeof FetchClient.use>[0] = {
			onRequest: ({ request }) =>
				responses[new URL(request.url).pathname]?.clone(),
		}
		FetchClient.use(middleware)
		const originalFetch = globalThis.fetch
		globalThis.fetch = async (input, init) => {
			const url = input instanceof Request ? input.url : input.toString()
			const path = new URL(url, globalThis.location.href).pathname
			return responses[path]?.clone() ?? originalFetch(input, init)
		}
		onCleanup(() => {
			FetchClient.eject(middleware)
			globalThis.fetch = originalFetch
		})
		return <Story />
	})
}
