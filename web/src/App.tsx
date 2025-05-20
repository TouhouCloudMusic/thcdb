import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { Meta, Title } from "@solidjs/meta"
import { createRouter, RouterProvider } from "@tanstack/solid-router"

import { routeTree } from "./routeTree.gen"
import { StateProvider } from "./state"

const router = createRouter({ routeTree })

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router
	}
}

// oxlint-disable-next-line no-default-export
export default function App() {
	return (
		<StateProvider>
			<Metas />
			<Routes />
		</StateProvider>
	)
}

function Metas() {
	const { t } = useLingui()
	return (
		<>
			<Title>
				<Trans>Touhou Cloud DB</Trans>
			</Title>
			<Meta
				name="description"
				content={t`Touhou Cloud DB is an open doujin music database`}
			/>
		</>
	)
}

function Routes() {
	return <RouterProvider router={router} />
}
