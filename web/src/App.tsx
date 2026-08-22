/* @refresh reload */
import { useLingui } from "@lingui/solid/macro"
import { Meta, Title } from "@solidjs/meta"
import { createRouter, RouterProvider } from "@tanstack/solid-router"

import type { RouteContext } from "~/route/__root"
import type { AppLocale } from "~/state/i18n"
import { useCurrentUser } from "~/state/user"

import { routeTree } from "./routeTree.gen"
import { StateProvider } from "./state"
import { NotFound } from "./view/NotFound"

function createAppRouter(context: RouteContext) {
	return createRouter({
		routeTree,
		context,
		// We use tanstack query, so we don't need the built-in cache of tanstack router
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: () => <NotFound />,
	})
}

type AppRouter = ReturnType<typeof createAppRouter>

declare module "@tanstack/solid-router" {
	interface Register {
		router: AppRouter
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
	const { t } = useLingui()
	return (
		<>
			<Title>{t`Touhou Cloud DB`}</Title>
			<Meta
				name="description"
				content={t`Touhou Cloud DB is an open doujin music database`}
			/>
		</>
	)
}

function Routes() {
	const router = createAppRouter({
		currentUser: useCurrentUser(),
	})

	return <RouterProvider router={router} />
}
