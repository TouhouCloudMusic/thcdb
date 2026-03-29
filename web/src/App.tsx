/* @refresh reload */
import { Meta, Title } from "@solidjs/meta"
import { createRouter, RouterProvider } from "@tanstack/solid-router"

import type { AppLocale } from "~/state/i18n"

import { routeTree } from "./routeTree.gen"
import { StateProvider } from "./state"
import { QUERY_CLIENT } from "./state/tanstack"
import { NotFound } from "./view/NotFound"

const router = createRouter({
	routeTree,
	context: {
		queryClient: QUERY_CLIENT,
	},
	// We use tanstack query, so we don't need the built-in cache of tanstack router
	defaultPreloadStaleTime: 0,
	defaultNotFoundComponent: () => <NotFound />,
})

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router
	}
}

type AppProps = {
	initialLocale: AppLocale
}

// oxlint-disable-next-line no-default-export
export default function App(props: AppProps) {
	return (
		<StateProvider initialLocale={props.initialLocale}>
			<Metas />
			<Routes />
		</StateProvider>
	)
}

function Metas() {
	return (
		<>
			<Title>Touhou Cloud DB</Title>
			<Meta
				name="description"
				content="Touhou Cloud DB is an open doujin music database"
			/>
		</>
	)
}

function Routes() {
	return <RouterProvider router={router} />
}
