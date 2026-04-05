import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import type { UserProfile } from "@thc/api"
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
	const profileQuery = useQuery(() => {
		const base = UserQuery.profileOption({
			"params.username": undefined,
			current_user: userCtx.user,
		})
		return {
			...base,
			enabled: userCtx.user !== undefined,
		}
	})

	return (
		<AuthGuard>
			<Show when={profileQuery.data}>
				{(profile) => {
					const data: UserProfile = profile()

					return (
						<Profile
							isCurrentUser
							data={data}
							pins={[]}
							activity={[]}
						/>
					)
				}}
			</Show>
		</AuthGuard>
	)
}
