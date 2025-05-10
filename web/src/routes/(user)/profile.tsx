import { createFileRoute } from "@tanstack/solid-router"
import { createResource } from "solid-js"
import { UserQuery } from "~/api"
import { AuthGuard } from "~/components/route"
import { useUserCtx } from "~/state/user"
import { Profile } from "~/views/user/Profile"

export const Route = createFileRoute("/(user)/profile")({
	component: RouteComponent,
})

function RouteComponent() {
	const userCtx = useUserCtx()
	const queryResult = UserQuery.profile({
		"params.username": undefined,
		current_user: userCtx.user,
	})

	const [data] = createResource(() =>
		// Have to do this to avoid error but idk why
		queryResult.promise.then((v) => v),
	)

	return (
		<AuthGuard>
			<Profile
				isCurrentUser={true}
				data={data}
			/>
		</AuthGuard>
	)
}
