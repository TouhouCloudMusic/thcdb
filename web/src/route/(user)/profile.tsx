import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { UserQuery } from "@thc/query"
import { Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { useCurrentUser } from "~/state/user"
import { Profile } from "~/view/user/Profile"

export const Route = createFileRoute("/(user)/profile")({
	component: RouteComponent,
})

function RouteComponent() {
	const userCtx = useCurrentUser()
	const query = useQuery(() =>
		UserQuery.profileOption({
			"params.username": undefined,
			current_user: userCtx.user,
		}),
	)

	return (
		<AuthGuard>
			<Show when={query.data}>
				{(data) => (
					<Profile
						isCurrentUser={true}
						data={data()}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
