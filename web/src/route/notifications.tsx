import { useLingui } from "@lingui/solid/macro"
import { useInfiniteQuery, useMutation } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { createEffect, createMemo, createSignal, on } from "solid-js"
import { fallback, object, optional } from "valibot"

import { AuthGuard } from "~/component/route"
import { showErrorToast } from "~/component/toast"
import {
	markRead,
	markUnread,
	saveNotification,
	unsaveNotification,
} from "~/hey-api"
import type { ListNotificationsResponse, NotificationItem } from "~/hey-api"
import {
	listNotificationsInfiniteOptions,
	readAllMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import {
	vNotificationCategory,
	vNotificationState,
} from "~/hey-api/valibot.gen"
import { refreshNotificationQueries } from "~/state/notification"
import { NotificationInboxPage } from "~/view/notification/InboxPage"
import type {
	NotificationListLoadMoreStatus,
	NotificationList,
} from "~/view/notification/InboxPage"

const PAGE_SIZE = 20

const notificationSearchSchema = object({
	state: optional(fallback(vNotificationState, "inbox"), "inbox"),
	category: fallback(optional(vNotificationCategory), undefined),
})

function createNotificationUpdateGuard() {
	const [pendingIds, setPendingIds] = createSignal<Set<NotificationItem["id"]>>(
		new Set(),
		{ equals: false },
	)

	return {
		isPending: (notificationId: NotificationItem["id"]) =>
			pendingIds().has(notificationId),
		start: (notificationId: NotificationItem["id"]) => {
			if (pendingIds().has(notificationId)) return false

			setPendingIds((current) => {
				current.add(notificationId)
				return current
			})
			return true
		},
		finish: (notificationId: NotificationItem["id"]) => {
			setPendingIds((current) => {
				current.delete(notificationId)
				return current
			})
		},
	}
}

export const Route = createFileRoute("/notifications")({
	component: RouteComponent,
	validateSearch: notificationSearchSchema,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<NotificationInboxContainer />
		</AuthGuard>
	)
}

function NotificationInboxContainer() {
	const { t } = useLingui()
	const navigate = Route.useNavigate()
	const search = Route.useSearch()
	const readUpdateGuard = createNotificationUpdateGuard()
	const savedUpdateGuard = createNotificationUpdateGuard()

	const listQuery = useInfiniteQuery(() => {
		const filters = search()

		return {
			...listNotificationsInfiniteOptions({
				query: {
					state: filters.state,
					category: filters.category,
					limit: PAGE_SIZE,
				},
			}),
			initialPageParam: { query: {} },
			getNextPageParam: (last: ListNotificationsResponse) => {
				const cursor = last.data.next_cursor
				if (cursor == null) return undefined

				return {
					query: {
						cursor_snapshot_inbox_seq: cursor.snapshot_inbox_seq,
						cursor_before_inbox_seq: cursor.before_inbox_seq,
					},
				}
			},
			refetchOnReconnect: false,
			refetchOnWindowFocus: false,
			staleTime: Infinity,
		}
	})

	createEffect(
		on(
			() => listQuery.errorUpdateCount,
			() => {
				if (listQuery.isRefetchError) {
					showErrorToast({ title: t`Failed to refresh notifications` })
				}
			},
			{ defer: true },
		),
	)

	const snapshotInboxSeq = () =>
		listQuery.data?.pages[0]?.data.snapshot_inbox_seq

	const setReadMutation = useMutation(() => ({
		mutationFn: async (input: { item: NotificationItem; read: boolean }) =>
			input.read
				? markRead({
						path: { notification_id: input.item.id },
						body: { through_seq: input.item.through_seq },
						throwOnError: true,
					})
				: markUnread({
						path: { notification_id: input.item.id },
						body: { from_seq: input.item.through_seq },
						throwOnError: true,
					}),
		onError: (_error, input) => {
			showErrorToast({
				title: input.read
					? t`Failed to mark notification read`
					: t`Failed to mark notification unread`,
			})
		},
		onSettled: (_data, _error, input) => {
			return refreshNotificationQueries().finally(() => {
				readUpdateGuard.finish(input.item.id)
			})
		},
	}))

	const setRead = (item: NotificationItem, read: boolean) => {
		const isRead = !item.is_unread
		if (isRead === read || !readUpdateGuard.start(item.id)) return

		setReadMutation.mutate({ item, read })
	}

	const markAllReadMutation = useMutation(() => ({
		...readAllMutation(),
		onError: () => {
			showErrorToast({ title: t`Failed to mark all notifications read` })
		},
		onSettled: refreshNotificationQueries,
	}))

	const markAllRead = () => {
		const snapshotSeq = snapshotInboxSeq()
		if (snapshotSeq == null) return

		markAllReadMutation.mutate({
			body: { snapshot_inbox_seq: snapshotSeq },
		})
	}

	const setSavedMutation = useMutation(() => ({
		mutationFn: async (input: { item: NotificationItem; saved: boolean }) => {
			const request = input.saved ? saveNotification : unsaveNotification
			return request({
				path: { notification_id: input.item.id },
				throwOnError: true,
			})
		},
		onError: () => {
			showErrorToast({ title: t`Failed to update saved notification` })
		},
		onSettled: (_data, _error, input) => {
			return refreshNotificationQueries().finally(() => {
				savedUpdateGuard.finish(input.item.id)
			})
		},
	}))
	const setSaved = (item: NotificationItem, saved: boolean) => {
		const isSaved = item.saved_at != null
		if (isSaved === saved || !savedUpdateGuard.start(item.id)) return

		setSavedMutation.mutate({ item, saved })
	}

	const list = createMemo<NotificationList>(() => {
		if (listQuery.isPending) {
			return { status: "loading" }
		}
		if (listQuery.isLoadingError) {
			return { status: "error" }
		}

		let loadMoreStatus: NotificationListLoadMoreStatus = "unavailable"
		if (listQuery.isFetchingNextPage && !listQuery.isPaused) {
			loadMoreStatus = "loading"
		} else if (listQuery.isFetchNextPageError) {
			loadMoreStatus = "error"
		} else if (listQuery.hasNextPage && listQuery.fetchStatus === "idle") {
			loadMoreStatus = "ready"
		}

		return {
			status: "loaded",
			items: listQuery.data.pages.flatMap((page) => page.data.items),
			loadMoreStatus,
		}
	})

	return (
		<NotificationInboxPage
			state={() => search().state}
			category={() => search().category}
			isUpdatingRead={(item) => readUpdateGuard.isPending(item.id)}
			isUpdatingSaved={(item) => savedUpdateGuard.isPending(item.id)}
			list={list}
			canMarkAllRead={() =>
				!markAllReadMutation.isPending && snapshotInboxSeq() != null
			}
			loadMore={() => {
				void listQuery.fetchNextPage()
			}}
			retry={() => {
				void listQuery.refetch()
			}}
			setState={(next) => {
				void navigate({
					search: (previous) => ({ ...previous, state: next }),
				})
			}}
			setCategory={(next) => {
				void navigate({
					search: (previous) => ({ ...previous, category: next }),
				})
			}}
			setRead={setRead}
			setSaved={setSaved}
			markAllRead={markAllRead}
		/>
	)
}
