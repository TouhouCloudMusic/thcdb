import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { UserApi } from "@thc/api"
import { UserQuery } from "@thc/query"
import { Either } from "effect"
import { Show, createSignal } from "solid-js"

import { userCollectionsInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"
import { useCurrentUser } from "~/state/user"
import { getNextPageParam } from "~/utils/query"
import { Profile } from "~/view/user/Profile"

export const Route = createFileRoute("/(user)/profile_/$username")({
	component: RouteComponent,
	loader: async ({ context, params: { username } }) => {
		const currentUser = context.currentUser
		if (
			currentUser.session.status === "loading"
			|| currentUser.isCurrentUser(username)
		) {
			return
		}

		await QUERY_CLIENT.ensureQueryData(
			UserQuery.profileOption({
				"params.username": username,
			}),
		)
	},
})

function RouteComponent() {
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const params = Route.useParams()
	const username = () => params().username
	const isSessionResolved = () => userCtx.session.status !== "loading"
	const isCurrentUser = () => userCtx.isCurrentUser(username())
	const [pendingAction, setPendingAction] = createSignal<
		"follow" | "unfollow" | undefined
	>(undefined)
	const [actionError, setActionError] = createSignal<string | undefined>()
	const profileQuery = useQuery(() => ({
		...UserQuery.profileOption({
			"params.username": username(),
		}),
		enabled: isSessionResolved() && !isCurrentUser(),
	}))
	const displayedProfile = () => {
		if (!isSessionResolved()) return

		return isCurrentUser() ? userCtx.profile : profileQuery.data
	}
	const collectionsQuery = useInfiniteQuery(() => {
		const name = displayedProfile()?.name

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

	const canFollow = () =>
		userCtx.profile !== undefined && !userCtx.isCurrentUser(username())
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
					}),
				})
			},
			onLeft: (error) => {
				setActionError(error.error)
			},
		})
	}

	return (
		<Show when={displayedProfile()}>
			{(profile) => (
				<Profile
					isCurrentUser={userCtx.isCurrentUser(username())}
					data={profile()}
					roles={
						userCtx.isCurrentUser(username())
							? userCtx.authorization?.roles
							: profileQuery.data?.roles
					}
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
			)}
		</Show>
	)
}
