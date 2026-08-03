import * as meta from "@solidjs/meta"
import type { QueryClient } from "@tanstack/solid-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"

import { Footer } from "~/component/Footer"
import { Header } from "~/component/Header"
import { Devtools } from "~/component/devtools"
import { AppToastRegion } from "~/component/toast"
import { useCurrentUser } from "~/state/user"
import { getErrorMessage } from "~/utils/getErrorMessage"
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
	const currentUser = useCurrentUser()
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
			<Header
				user={currentUser.user}
				notificationState={currentUser.notification_state}
				onSignOut={() => void currentUser.sign_out()}
			/>
			<main>{props.children}</main>
			<Footer />
		</div>
	)
}
