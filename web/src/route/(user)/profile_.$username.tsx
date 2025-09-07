import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { UserQuery } from "@thc/query"
import { Show } from "solid-js"

import { QUERY_CLIENT } from "~/state/tanstack"
import { Profile } from "~/view/user/Profile"

export const Route = createFileRoute("/(user)/profile_/$username")({
	component: RouteComponent,
	loader: ({ params: { username } }) =>
		QUERY_CLIENT.ensureQueryData(
			UserQuery.profileOption({
				"params.username": username,
			}),
		),
})

function RouteComponent() {
	const params = Route.useParams()
	const query = useQuery(() =>
		UserQuery.profileOption({
			"params.username": params().username,
		}),
	)

	return (
		<Show when={query.data}>
			{(data) => (
				<Profile
					isCurrentUser={false}
					data={data()}
				/>
			)}
		</Show>
	)
}
