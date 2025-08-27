import { Navigate } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import { Show } from "solid-js"

import { useCurrentUser } from "~/state/user"

export function AuthGuard(props: ParentProps) {
	let user_ctx = useCurrentUser()
	return (
		<Show
			when={user_ctx.user}
			fallback={<Navigate to="/" />}
		>
			{props.children}
		</Show>
	)
}
