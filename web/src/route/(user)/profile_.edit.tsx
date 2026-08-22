import { useLingui } from "@lingui/solid/macro"
import { createFileRoute } from "@tanstack/solid-router"
import { UserApi } from "@thc/api"
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

	return (
		<AuthGuard>
			<Show
				when={userCtx.profile?.name}
				keyed
			>
				<EditProfilePage />
			</Show>
		</AuthGuard>
	)
}

function EditProfilePage() {
	const { t } = useLingui()
	const userCtx = useCurrentUser()

	const baseBio = () => userCtx.profile?.bio ?? ""
	const updateBio = userCtx.bindCurrentSession((bio: string) => {
		userCtx.updateProfile((profile) => ({ ...profile, bio }))
	})
	const refreshProfile = userCtx.bindCurrentSession(userCtx.refreshProfile)

	const store = createEditProfileStore({
		baseBio,
		uploadFailedMessage: t`Upload failed.`,
		saveFailedMessage: t`Save failed.`,
		saveBio: async (next) => {
			const result = await UserApi.updateBio(next)
			if (E.isLeft(result)) {
				throw new Error(result.left.error)
			}

			updateBio(next)
		},
		uploadAvatar: async (file) => {
			const result = await UserApi.uploadAvatar(file)
			if (E.isLeft(result)) {
				throw new Error(result.left.error)
			}

			await refreshProfile()
		},
		uploadBanner: async (file) => {
			const result = await UserApi.uploadProfileBanner(file)
			if (E.isLeft(result)) {
				throw new Error(result.left.error)
			}

			await refreshProfile()
		},
	})

	return (
		<Show when={userCtx.profile}>
			{(profile) => (
				<EditProfileView
					user={profile()}
					store={store}
				/>
			)}
		</Show>
	)
}
