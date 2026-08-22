import * as meta from "@solidjs/meta"
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"

import { Footer } from "~/component/Footer"
import { Header } from "~/component/Header"
import { Devtools } from "~/component/devtools"
import { AppToastRegion } from "~/component/toast"
import type { UserStore } from "~/state/user"
import { getErrorMessage } from "~/utils/getErrorMessage"
import { NotFound } from "~/view/NotFound"
import { InternalServerError } from "~/view/error/InternalServerError"

export type RouteContext = {
	currentUser: UserStore
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

function RouteTree() {
	return (
		<Layout>
			<Outlet />
			<AppToastRegion />
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
