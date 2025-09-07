import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EditProfile } from "~/view/user/EditProfile"

export const Route = createFileRoute("/(user)/profile_/edit")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditProfile />
		</AuthGuard>
	)
}
