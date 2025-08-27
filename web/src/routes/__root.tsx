import * as meta from "@solidjs/meta"
import { Title } from "@solidjs/meta"
import { createRootRoute, Outlet } from "@tanstack/solid-router"
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools"
import type { ParentProps } from "solid-js"
import { ErrorBoundary } from "solid-js"

import { Header } from "~/components/Header"
import { NotFound } from "~/views/NotFound"
import { InternalServerError } from "~/views/error/InternalServerError"

export const Route = createRootRoute({
	component: RouteTree,
	notFoundComponent: NotFound,
})

function RouteTree() {
	return (
		<Layout>
			<AppErrorBoundary>
				<Outlet />
				<TanStackRouterDevtools />
			</AppErrorBoundary>
		</Layout>
	)
}

function Layout(props: ParentProps) {
	// TODO: Need fix, transition bettwen language change
	// const layoutStyle = createMemo(() =>
	//   useI18N().duringTransition() ?
	//     {
	//       transition: "color .3s",
	//       "transition-delay": ".1s",
	//       "transition-timing-function": "ease-in",
	//     }
	//   : undefined,
	// )

	return (
		<div class="grid h-full grid-rows-[auto_1fr_auto]">
			<Title>Doujin Cloud DB</Title>
			<meta.Link
				rel="shortcut icon"
				href="/logo.svg"
				type="image/x-icon"
			/>
			<Header />
			<main>{props.children}</main>
			<footer class="h-[300px] bg-gray-1000 pt-10"></footer>
		</div>
	)
}

function AppErrorBoundary(props: ParentProps) {
	if (!import.meta.env.DEV) {
		// eslint-disable-next-line solid/components-return-once
		return <>{props.children}</>
	}
	// eslint-disable-next-line solid/components-return-once
	return (
		<ErrorBoundary
			fallback={(e: Error) => <InternalServerError msg={e.stack} />}
		>
			{props.children}
		</ErrorBoundary>
	)
}
