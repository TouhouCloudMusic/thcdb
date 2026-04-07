import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { UserApi } from "@thc/api"
import { UserQuery } from "@thc/query"
import { Either as E } from "effect"
import { Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { useCurrentUser } from "~/state/user"
import {
	createEditProfileStore,
	EditProfileView,
} from "~/view/user/edit_profile"

export const Route = createFileRoute("/(user)/profile_/edit")({
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

	const baseBio = () => query.data?.bio ?? ""
	const store = createEditProfileStore({
		baseBio,
		saveBio: async (next) => {
			const result = await UserApi.updateBio(next)
			if (E.isLeft(result)) {
				throw new Error(result.left.error)
			}

			userCtx.updateUser((user) => ({ ...user, bio: next }))
		},
		uploadAvatar: async (file) => {
			const result = await UserApi.uploadAvatar(file)
			if (E.isLeft(result)) {
				throw new Error(result.left.error)
			}
			await userCtx.flush()
		},
		uploadBanner: async (file) => {
			const result = await UserApi.uploadProfileBanner(file)
			if (E.isLeft(result)) {
				throw new Error(result.left.error)
			}
			await userCtx.flush()
		},
	})

	return (
		<AuthGuard>
			<Show when={query.data}>
				{(user) => (
					<EditProfileView
						user={user()}
						store={store}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
