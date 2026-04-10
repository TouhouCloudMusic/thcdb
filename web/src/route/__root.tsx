import * as meta from "@solidjs/meta"
import type { QueryClient } from "@tanstack/solid-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router"
import { ObjExt } from "@thc/toolkit/data"
import type { ParentProps } from "solid-js"

import { Footer } from "~/component/Footer"
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
		return error.message
	}
	if (typeof error === "string") return error
	if (ObjExt.isRecord(error)) {
		const message = error["message"]
		if (typeof message === "string" && message.length > 0) return message
		const fallback = error["error"]
		if (typeof fallback === "string" && fallback.length > 0) return fallback
	}
	try {
		return JSON.stringify(error, (key, value) =>
			key === "stack" ? undefined : (value as unknown),
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
			<meta.Link
				rel="shortcut icon"
				href="/logo.svg"
				type="image/x-icon"
			/>
			<Header />
			<main>{props.children}</main>
			<Footer />
		</div>
	)
}
