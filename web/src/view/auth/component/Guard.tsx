import { Navigate } from "@tanstack/solid-router"
import { Show } from "solid-js"
import type { ParentProps } from "solid-js"

import { useCurrentUser } from "~/state/user"

// TODO: Move to comps
export function NotSignedIn(props: ParentProps) {
	return (
		<Show
			when={!useCurrentUser().is_signed_in}
			fallback={<Navigate to="/" />}
		>
			{props.children}
		</Show>
	)
}
