import { useLingui } from "@lingui/solid/macro"
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/solid-query"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { Match, Switch } from "solid-js"

import {
	deleteUserCollection,
	deleteUserCollectionItem,
	followUserCollection,
	reorderUserCollectionItems,
	unfollowUserCollection,
} from "~/hey-api"
import type { UserCollection } from "~/hey-api"
import {
	followedUserCollectionsQueryKey,
	publicUserCollectionsQueryKey,
	userCollectionDetailOptions,
	userCollectionDetailQueryKey,
	userCollectionItemsInfiniteOptions,
	userCollectionItemsQueryKey,
	userCollectionsQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { QUERY_CLIENT } from "~/state/tanstack"
import { useCurrentUser } from "~/state/user"
import { getErrorMessage } from "~/utils/getErrorMessage"
import { getNextPageParam } from "~/utils/query"
import type {
	CollectionDetailController,
	CollectionDetailModel,
} from "~/view/collection/CollectionDetail"
import { CollectionDetailPage } from "~/view/collection/CollectionDetail"

type CollectionFollowCommand = "follow" | "unfollow"

export const Route = createFileRoute("/collection/$id")({
	component: RouteComponent,
})

function RouteComponent() {
	const { t } = useLingui()
	const params = Route.useParams()
	const navigate = useNavigate()
	const userCtx = useCurrentUser()
	const id = () => Number(params().id)

	const collectionQuery = useQuery(() =>
		userCollectionDetailOptions({
			path: { id: id() },
		}),
	)

	const itemsQuery = useInfiniteQuery(() => ({
		...userCollectionItemsInfiniteOptions({
			path: { id: id() },
			query: { limit: 100 },
		}),
		initialPageParam: 1,
		getNextPageParam,
	}))
	const itemsFetchState = (): CollectionDetailModel["items"] => {
		if (itemsQuery.isError && !itemsQuery.isFetching) {
			return { status: "error" }
		}
		if (itemsQuery.isSuccess) {
			return {
				status: "success",
				items: itemsQuery.data.pages.flatMap((page) => page.data.items),
				isFetchingMore: itemsQuery.isFetchingNextPage,
				hasMore: itemsQuery.hasNextPage,
			}
		}
		return { status: "loading" }
	}

	const deleteItemMutation = useMutation(() => ({
		mutationFn: async (itemId: number) => {
			return deleteUserCollectionItem({
				path: { id: id(), item_id: itemId },
				throwOnError: true,
			})
		},
		onSuccess: () => {
			const collection = collectionQuery.data?.data
			void QUERY_CLIENT.invalidateQueries({
				queryKey: userCollectionItemsQueryKey({
					path: { id: id() },
				}),
			})
			void QUERY_CLIENT.invalidateQueries({
				queryKey: userCollectionDetailQueryKey({
					path: { id: id() },
				}),
			})
			if (collection) {
				void QUERY_CLIENT.invalidateQueries({
					queryKey: userCollectionsQueryKey({
						path: { username: collection.owner.name },
					}),
				})
			}
		},
	}))

	const reorderItemsMutation = useMutation(() => ({
		mutationFn: async (itemIds: number[]) => {
			return reorderUserCollectionItems({
				path: { id: id() },
				body: { item_ids: itemIds },
				throwOnError: true,
			})
		},
		onSuccess: () => {
			void QUERY_CLIENT.invalidateQueries({
				queryKey: userCollectionItemsQueryKey({
					path: { id: id() },
				}),
			})
		},
	}))

	const deleteMutation = useMutation(() => ({
		mutationFn: async () => {
			return deleteUserCollection({
				path: { id: id() },
				throwOnError: true,
			})
		},
		onSuccess: () => {
			const collection = collectionQuery.data?.data
			if (!collection) return

			void QUERY_CLIENT.invalidateQueries({
				queryKey: userCollectionsQueryKey({
					path: { username: collection.owner.name },
				}),
			})
			void navigate({
				to: "/profile/$username",
				params: { username: collection.owner.name },
			})
		},
	}))

	const invalidateCollectionFollowQueries = () => {
		const collection = collectionQuery.data?.data

		void QUERY_CLIENT.invalidateQueries({
			queryKey: userCollectionDetailQueryKey({
				path: { id: id() },
			}),
		})
		void QUERY_CLIENT.invalidateQueries({
			queryKey: followedUserCollectionsQueryKey(),
		})
		void QUERY_CLIENT.invalidateQueries({
			queryKey: publicUserCollectionsQueryKey(),
		})
		if (collection) {
			void QUERY_CLIENT.invalidateQueries({
				queryKey: userCollectionsQueryKey({
					path: { username: collection.owner.name },
				}),
			})
		}
	}

	const followMutation = useMutation(() => ({
		mutationFn: async (command: CollectionFollowCommand) => {
			const options = {
				path: { id: id() },
				throwOnError: true,
			} as const

			if (command === "follow") {
				return followUserCollection(options)
			}
			return unfollowUserCollection(options)
		},
		onSuccess: invalidateCollectionFollowQueries,
	}))

	const followMutationErrorMessage = () =>
		followMutation.isError
			? getErrorMessage(followMutation.error, t`Request failed.`)
			: undefined
	const collectionViewer = (
		collection: UserCollection,
	): CollectionDetailModel["viewer"] => {
		if (userCtx.profile?.name === collection.owner.name) {
			return {
				role: "owner",
				isDeletingCollection: deleteMutation.isPending,
				isDeletingItem: deleteItemMutation.isPending,
				isReorderingItems: reorderItemsMutation.isPending,
			}
		}

		if (
			collection.is_following === undefined
			|| collection.is_following === null
		) {
			return { role: "readonly" }
		}

		return {
			role: "visitor",
			isFollowing: collection.is_following,
			isTogglingFollow: followMutation.isPending,
			followErrorMessage: followMutationErrorMessage(),
		}
	}
	const collectionDetailModel = (
		collection: UserCollection,
	): CollectionDetailModel => ({
		collection,
		items: itemsFetchState(),
		viewer: collectionViewer(collection),
	})
	const collectionDetailController: CollectionDetailController = {
		retryItems: () => {
			void itemsQuery.refetch()
		},
		loadMoreItems: () => {
			void itemsQuery.fetchNextPage()
		},
		deleteCollection: () => {
			deleteMutation.mutate()
		},
		deleteItem: (itemId) => {
			deleteItemMutation.mutate(itemId)
		},
		reorderItems: (itemIds) => {
			reorderItemsMutation.mutate(itemIds)
		},
		toggleFollow: () => {
			const collection = collectionQuery.data?.data
			if (
				collection?.is_following === undefined
				|| collection.is_following === null
			) {
				return
			}

			followMutation.mutate(collection.is_following ? "unfollow" : "follow")
		},
	}

	return (
		<PageLayout class="p-4 @xl:p-8 @xl:pt-6">
			<Switch>
				<Match when={collectionQuery.isLoading}>
					<div class="grid min-h-[50vh] place-items-center">
						<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-tertiary shadow-xs ring-1 ring-slate-200 ring-inset">
							<span class="inline-block size-1.5 animate-pulse rounded-full bg-slate-300"></span>
							{t`Loading...`}
						</div>
					</div>
				</Match>
				<Match when={collectionQuery.isError}>
					<div class="grid min-h-[50vh] place-items-center">
						<div class="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm text-red-600 shadow-xs ring-1 ring-red-200 ring-inset">
							<span class="inline-block size-1.5 rounded-full bg-red-400"></span>
							{t`Failed to load collection details.`}
						</div>
					</div>
				</Match>
				<Match when={collectionQuery.data}>
					{(collection) => (
						<CollectionDetailPage
							model={collectionDetailModel(collection().data)}
							controller={collectionDetailController}
						/>
					)}
				</Match>
			</Switch>
		</PageLayout>
	)
}
