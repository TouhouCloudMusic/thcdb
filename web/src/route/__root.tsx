import * as meta from "@solidjs/meta"
import { Title } from "@solidjs/meta"
import type { QueryClient } from "@tanstack/solid-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"

import { Header } from "~/component/Header"
import { Devtools } from "~/component/devtools"
import { NotFound } from "~/view/NotFound"
import { InternalServerError } from "~/view/error/InternalServerError"

type RouteContext = {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouteContext>()({
	component: RouteTree,
	head: () => ({
		styles: [
			{
				// https://github.com/TanStack/router/issues/6601
				children: `
@import url("https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap");
`,
			},
		],
	}),
	notFoundComponent: NotFound,
	errorComponent: (e) => <InternalServerError msg={getErrorMessage(e.error)} />,
})

const getErrorMessage = (error: unknown) => {
	if (error instanceof Error) {
		return error.message ?? error.stack ?? "Unknown error"
	}
	if (typeof error === "string") return error
	if (typeof error === "object" && error !== null) {
		const message = Reflect.get(error, "message")
		if (typeof message === "string" && message) return message
		const fallback = Reflect.get(error, "error")
		if (typeof fallback === "string" && fallback) return fallback
	}
	try {
		return JSON.stringify(error, (key, value) =>
			key === "stack" ? undefined : value,
		)
	} catch {
		return "Unknown error"
	}
}

function RouteTree() {
	return (
		<Layout>
			<Outlet />
			<Devtools />
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
			<footer class="h-[300px] bg-slate-900 pt-10"></footer>
		</div>
	)
}
