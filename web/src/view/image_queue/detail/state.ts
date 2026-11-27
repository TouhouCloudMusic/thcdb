import { useLingui } from "@lingui/solid/macro"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import type { QueryClient } from "@tanstack/solid-query"
import { ArtistQueryOption } from "@thc/query"
import { produce } from "immer"
import { createMemo } from "solid-js"

import { showErrorToast } from "~/component/toast"
import { hasUserPermission } from "~/domain/user/authorization"
import { USER_PERMISSION_NAMES } from "~/domain/user/constants"
import type {
	DataImageQueueDetail,
	ImageQueueAction,
	ImageQueueDetail,
} from "~/hey-api"
import {
	exploreArtistInfiniteQueryKey,
	exploreArtistQueryKey,
	exploreReleaseInfiniteQueryKey,
	exploreReleaseQueryKey,
	findArtistByIdQueryKey,
	findReleaseByIdQueryKey,
	getHomeQueryKey,
	imageQueueDetailOptions,
	imageQueueDetailQueryKey,
	moderateImageQueueMutation,
	setImageQueueSubscriptionMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { invalidateImageQueueLists } from "~/query/imageQueue"
import { useCurrentUser } from "~/state/user"
import { ready } from "~/type/asyncData"
import type { AsyncData } from "~/type/asyncData"
import { useEntityComments } from "~/view/comment/useEntityComments"

import type { ImageQueueDetailViewProps } from "./model"

type DetailContent = Omit<ImageQueueDetailViewProps, "comments">

function invalidatePublishedImage(
	client: QueryClient,
	target: ImageQueueDetail["target"],
) {
	void client.invalidateQueries({ queryKey: getHomeQueryKey() })
	switch (target.kind) {
		case "artist": {
			void client.invalidateQueries({
				queryKey: ArtistQueryOption.profileQueryKey(target.id),
			})
			void client.invalidateQueries({
				queryKey: findArtistByIdQueryKey({ path: { id: target.id } }),
			})
			void client.invalidateQueries({ queryKey: exploreArtistQueryKey() })
			void client.invalidateQueries({
				queryKey: exploreArtistInfiniteQueryKey(),
			})
			break
		}
		case "release": {
			void client.invalidateQueries({
				queryKey: findReleaseByIdQueryKey({ path: { id: target.id } }),
			})
			void client.invalidateQueries({ queryKey: exploreReleaseQueryKey() })
			void client.invalidateQueries({
				queryKey: exploreReleaseInfiniteQueryKey(),
			})
			break
		}
	}
}

export function useImageQueueDetail(entryId: number) {
	const { t } = useLingui()
	const client = useQueryClient()
	const user = useCurrentUser()
	const path = { id: entryId }
	const detailKey = imageQueueDetailQueryKey({ path })
	const detailQuery = useQuery(() => imageQueueDetailOptions({ path }))
	const moderation = useMutation(moderateImageQueueMutation)
	const subscription = useMutation(setImageQueueSubscriptionMutation)
	const comments = useEntityComments(() => ({
		entityType: "image-queue",
		entityId: entryId,
		onCommentCreated: () =>
			void client.invalidateQueries({ queryKey: detailKey }),
	}))
	const canModerate = createMemo(() =>
		hasUserPermission(
			user.authorization,
			USER_PERMISSION_NAMES.ImageQueueManage,
		),
	)
	const setSubscription = async (subscribed: boolean) => {
		const update = user.bindCurrentSession((next: boolean) => {
			if (client.getQueryState(detailKey)?.status === "success") {
				client.setQueryData<DataImageQueueDetail>(
					detailKey,
					produce((detail) => {
						if (detail) detail.data.is_subscribed = next
					}),
				)
			}
			void client.invalidateQueries({ queryKey: detailKey })
		})
		const showFailure = user.bindCurrentSession(() => {
			showErrorToast({ title: t`Failed to update subscription` })
		})
		const response = await subscription
			.mutateAsync({ path, query: { subscribed } })
			.catch(showFailure)
		if (response) update(response.data.subscribed)
	}

	const moderate = async (action: ImageQueueAction) => {
		const detail = detailQuery.data?.data
		if (!detail) return
		try {
			await moderation.mutateAsync({ path, query: { action } })
			invalidateImageQueueLists(client, detail.created_by.name)
			if (action !== "Reject") invalidatePublishedImage(client, detail.target)
		} finally {
			await client.invalidateQueries({ queryKey: detailKey })
		}
	}

	const state = createMemo<
		AsyncData<
			DetailContent,
			{
				cachedData?: DetailContent
				retry: () => void
				retrying: boolean
			}
		>
	>(() => {
		const detail = detailQuery.data?.data
		const view = detail
			? {
					detail,
					review: canModerate()
						? {
								targetName: detail.target.name,
								disabled: detailQuery.isError,
								onModerate: moderate,
							}
						: undefined,
					subscription: {
						isSubscribed: detail.is_subscribed,
						disabled:
							subscription.isPending || user.session.status !== "authenticated",
						toggle: () => void setSubscription(!detail.is_subscribed),
					},
				}
			: undefined
		if (detailQuery.isError) {
			return {
				kind: "error",
				cachedData: view,
				retry: () => void detailQuery.refetch(),
				retrying: detailQuery.isFetching,
			}
		}
		return view ? ready(view) : { kind: "loading" }
	})
	return { state, comments }
}
