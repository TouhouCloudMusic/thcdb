import { Navigate } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import { Match, Switch } from "solid-js"

import { SessionLoading } from "~/component/route"
import { useCurrentUser } from "~/state/user"

// TODO: Move to comps
export function NotSignedIn(props: ParentProps) {
	const currentUser = useCurrentUser()

	return (
		<Switch>
			<Match when={currentUser.session.status === "loading"}>
				<SessionLoading />
			</Match>
			<Match when={currentUser.session.status === "anonymous"}>
				{props.children}
			</Match>
			<Match when={currentUser.session.status === "authenticated"}>
				<Navigate to="/" />
			</Match>
		</Switch>
	)
}
