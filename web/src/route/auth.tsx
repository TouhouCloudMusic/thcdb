import { createFileRoute, Outlet, useLocation } from "@tanstack/solid-router"
import { createMemo } from "solid-js"

import { PageLayout } from "~/layout/PageLayout"
import { NotSignedIn } from "~/view/auth/component/Guard"

export const Route = createFileRoute("/auth")({
	component: RouteComponent,
})

function RouteComponent() {
	const location = useLocation()
	const contentHeight = createMemo(() => {
		switch (location().pathname) {
			case "/auth/sign-up": {
				return "min-h-116"
			}
			case "/auth/reset-password/success": {
				return "min-h-44"
			}
			case "/auth/forgot-password": {
				return "min-h-68"
			}
			default: {
				return "min-h-76"
			}
		}
	})
	return (
		<PageLayout class="px-4 py-8 sm:px-6 sm:pb-16 sm:pt-20 [@media(max-height:40rem)]:pt-8">
			<div class="mx-auto w-full max-w-100">
				<div class="mb-6 flex items-center gap-3">
					<img
						src="/logo.svg"
						alt=""
						class="size-8"
					/>
					<span class="text-sm text-secondary">Touhou Cloud DB</span>
				</div>
				<div class={contentHeight()}>
					<NotSignedIn>
						<Outlet />
					</NotSignedIn>
				</div>
			</div>
		</PageLayout>
	)
}
