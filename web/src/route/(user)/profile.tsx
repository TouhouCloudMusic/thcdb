import { useInfiniteQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { Show } from "solid-js"
import * as v from "valibot"

import { AuthGuard } from "~/component/route"
import {
	followedUserCollectionsInfiniteOptions,
	userCollectionsInfiniteOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { useCurrentUser } from "~/state/user"
import { getNextPageParam } from "~/utils/query"
import { Profile } from "~/view/user/Profile"

const searchSchema = v.object({
	tab: v.fallback(
		v.optional(v.picklist(["activity", "collections"])),
		"activity",
	),
})

export const Route = createFileRoute("/(user)/profile")({
	component: RouteComponent,
	validateSearch: searchSchema,
})

function RouteComponent() {
	const userCtx = useCurrentUser()
	const search = Route.useSearch()
	const navigate = Route.useNavigate()

	const collectionsQuery = useInfiniteQuery(() => {
		const username = userCtx.profile?.name

		return {
			...userCollectionsInfiniteOptions({
				path: { username: username ?? "" },
				query: { limit: 100 },
			}),
			initialPageParam: 1,
			getNextPageParam,
			enabled: username !== undefined,
		}
	})

	const followedCollectionsQuery = useInfiniteQuery(() => {
		const username = userCtx.profile?.name

		return {
			...followedUserCollectionsInfiniteOptions({
				query: { limit: 100 },
			}),
			initialPageParam: 1,
			getNextPageParam,
			enabled: username !== undefined,
		}
	})

	return (
		<AuthGuard>
			<Show when={userCtx.profile}>
				{(profile) => (
					<Profile
						isCurrentUser
						data={profile()}
						roles={userCtx.authorization?.roles}
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
						followedCollections={
							followedCollectionsQuery.isSuccess
								? followedCollectionsQuery.data.pages.flatMap(
										(page) => page.data.items,
									)
								: []
						}
						hasMoreFollowedCollections={followedCollectionsQuery.hasNextPage}
						isFetchingMoreFollowedCollections={
							followedCollectionsQuery.isFetchingNextPage
						}
						onLoadMoreFollowedCollections={() => {
							void followedCollectionsQuery.fetchNextPage()
						}}
						tab={{
							value: search().tab ?? "activity",
							onChange: (tab) => {
								void navigate({
									search: (prev) => ({
										...prev,
										tab,
									}),
								})
							},
						}}
						pins={[]}
						activity={[]}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
