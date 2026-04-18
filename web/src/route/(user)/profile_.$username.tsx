import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { UserApi } from "@thc/api"
import type { UserProfile } from "@thc/api"
import { UserQuery } from "@thc/query"
import { Either } from "effect"
import { Show, createSignal } from "solid-js"

import { userCollectionsInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"
import { ensureCurrentUser, useCurrentUser } from "~/state/user"
import { getNextPageParam } from "~/utils/query"
import { Profile } from "~/view/user/Profile"

export const Route = createFileRoute("/(user)/profile_/$username")({
	component: RouteComponent,
	loader: async ({ params: { username } }) => {
		const viewer = await ensureCurrentUser()
		const currentUserProfile = resolveCurrentUserProfile(viewer, username)
		await QUERY_CLIENT.ensureQueryData(
			UserQuery.profileOption({
				"params.username": username,
				current_user: currentUserProfile,
				viewer_name: viewer?.name,
			}),
		)
		return null
	},
})

function RouteComponent() {
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const params = Route.useParams()
	const viewer = () => userCtx.user
	const username = () => params().username
	const currentUserProfile = () =>
		resolveCurrentUserProfile(viewer(), username())
	const [pendingAction, setPendingAction] = createSignal<
		"follow" | "unfollow" | undefined
	>(undefined)
	const [actionError, setActionError] = createSignal<string | undefined>()
	const profileQuery = useQuery(() =>
		UserQuery.profileOption({
			"params.username": username(),
			current_user: currentUserProfile(),
			viewer_name: viewer()?.name,
		}),
	)
	const collectionsQuery = useInfiniteQuery(() => {
		const name = profileQuery.data?.name

		return {
			...userCollectionsInfiniteOptions({
				path: { username: name ?? "" },
				query: { limit: 100 },
			}),
			initialPageParam: 1,
			getNextPageParam,
			enabled: name !== undefined,
		}
	})

	const isCurrentUser = () => currentUserProfile() !== undefined
	const canFollow = () => viewer() !== undefined && !isCurrentUser()
	const submit = async (action: "follow" | "unfollow") => {
		if (pendingAction() || !canFollow()) {
			return
		}

		setActionError(undefined)
		setPendingAction(action)

		const result =
			action === "follow"
				? await UserApi.follow(username())
				: await UserApi.unfollow(username())

		setPendingAction(undefined)

		Either.match(result, {
			onRight: () => {
				setActionError(undefined)
				void queryClient.invalidateQueries({
					queryKey: UserQuery.profileQueryKey({
						"params.username": username(),
						current_user: currentUserProfile(),
						viewer_name: viewer()?.name,
					}),
				})
			},
			onLeft: (error) => {
				setActionError(error.error)
			},
		})
	}

	return (
		<Show when={profileQuery.data}>
			{(profile) => {
				const data: UserProfile = profile()

				return (
					<Profile
						isCurrentUser={isCurrentUser()}
						data={data}
						collections={
							collectionsQuery.isSuccess
								? collectionsQuery.data.pages.flatMap((page) => page.data.items)
								: []
						}
						hasMoreCollections={collectionsQuery.hasNextPage}
						isFetchingMoreCollections={collectionsQuery.isFetchingNextPage}
						onLoadMoreCollections={() => {
							void collectionsQuery.fetchNextPage()
						}}
						pins={[]}
						activity={[]}
						action={
							canFollow()
								? {
										pendingAction: pendingAction(),
										errorMessage: actionError(),
										onFollow: () => {
											void submit("follow")
										},
										onUnfollow: () => {
											void submit("unfollow")
										},
									}
								: undefined
						}
					/>
				)
			}}
		</Show>
	)
}

function resolveCurrentUserProfile(
	viewer: UserProfile | undefined,
	username: string,
): UserProfile | undefined {
	return viewer?.name === username ? viewer : undefined
}
