import { Navigate } from "@tanstack/solid-router"
import { Show, type ParentProps } from "solid-js"

import { useUserCtx } from "~/state/user"

// TODO: Move to comps
export function NotSignedIn(props: ParentProps) {
	return (
		<Show
			when={!useUserCtx().is_signed_in}
			fallback={<Navigate to="/" />}
		>
			{props.children}
		</Show>
	)
}
