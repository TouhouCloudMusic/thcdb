import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import type { UserProfile } from "@thc/api"
import { UserQuery } from "@thc/query"
import { Show } from "solid-js"
import * as v from "valibot"

import { AuthGuard } from "~/component/route"
import { userCollectionsInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
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

	const collectionsQuery = useInfiniteQuery(() => {
		const username = profileQuery.data?.name

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

	return (
		<AuthGuard>
			<Show when={profileQuery.data}>
				{(profile) => {
					const data: UserProfile = profile()

					return (
						<Profile
							isCurrentUser
							data={data}
							collections={
								collectionsQuery.isSuccess
									? collectionsQuery.data.pages.flatMap(
											(page) => page.data.items,
										)
									: []
							}
							hasMoreCollections={collectionsQuery.hasNextPage}
							isFetchingMoreCollections={collectionsQuery.isFetchingNextPage}
							onLoadMoreCollections={() => {
								void collectionsQuery.fetchNextPage()
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
					)
				}}
			</Show>
		</AuthGuard>
	)
}
