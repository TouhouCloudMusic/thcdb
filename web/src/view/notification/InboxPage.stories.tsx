import { createMemo, createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type {
	NotificationCategory,
	NotificationItem,
	NotificationState,
} from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import type { NotificationList } from "./InboxPage"
import { NotificationInboxPage } from "./InboxPage"

function noop() {
	return undefined
}

type StoryNotification = {
	category: NotificationCategory
	item: NotificationItem
}

const NOTIFICATIONS = [
	{
		category: "Comment",
		item: {
			id: "01900f01-aaaa-7000-8000-000000000001",
			body: {
				kind: "CommentReplied",
				container: {
					kind: "Correction",
					id: 12,
					name: "蓬莱人形 ～ Dolls in Pseudo Paradise",
				},
				reply: {
					state: "Visible",
					id: 45,
					actor: { id: 2, name: "alice" },
					content: "I added the source here.",
					created_at: "2026-06-20T09:41:00Z",
				},
			},
			is_unread: true,
			through_seq: "1",
			saved_at: null,
			created_at: "2026-06-20T09:41:00Z",
			last_activity_at: "2026-06-20T09:41:00Z",
		},
	},
	{
		category: "Social",
		item: {
			id: "01900f01-aaaa-7000-8000-000000000002",
			body: {
				kind: "UserFollowed",
				actor: { id: 3, name: "bob" },
			},
			is_unread: false,
			through_seq: "1",
			saved_at: "2026-06-19T10:05:00Z",
			created_at: "2026-06-19T10:00:00Z",
			last_activity_at: "2026-06-19T10:00:00Z",
		},
	},
] satisfies StoryNotification[]

const STORY_SAVED_AT = "2026-06-25T14:00:00Z"

// Update these scenarios when NotificationInboxPage changes its visually distinct list states.
const STORY_LIST_STATES = [
	"loaded",
	"empty",
	"loading",
	"error",
	"loading-more",
	"load-more-error",
] as const

type StoryListState = (typeof STORY_LIST_STATES)[number]

function StoryRoot(props: { listState: StoryListState }) {
	const [state, setState] = createSignal<NotificationState>("inbox")
	const [category, setCategory] = createSignal<
		NotificationCategory | undefined
	>()
	const [notifications, setNotifications] =
		createSignal<readonly StoryNotification[]>(NOTIFICATIONS)

	const visibleItems = createMemo(() => {
		const selectedState = state()
		const selectedCategory = category()

		return notifications()
			.filter((notification) => {
				if (
					selectedCategory != null
					&& notification.category !== selectedCategory
				) {
					return false
				}

				switch (selectedState) {
					case "inbox": {
						return true
					}
					case "unread": {
						return notification.item.is_unread
					}
					case "saved": {
						return notification.item.saved_at != null
					}
				}
			})
			.map((notification) => notification.item)
	})

	const list = createMemo<NotificationList>(() => {
		switch (props.listState) {
			case "loaded": {
				return {
					status: "loaded",
					items: visibleItems(),
					loadMoreStatus: "unavailable",
				}
			}
			case "empty": {
				return {
					status: "loaded",
					items: [],
					loadMoreStatus: "unavailable",
				}
			}
			case "loading": {
				return { status: "loading" }
			}
			case "error": {
				return { status: "error" }
			}
			case "loading-more": {
				return {
					status: "loaded",
					items: visibleItems(),
					loadMoreStatus: "loading",
				}
			}
			case "load-more-error": {
				return {
					status: "loaded",
					items: visibleItems(),
					loadMoreStatus: "error",
				}
			}
		}
	})

	const updateNotification = (
		target: NotificationItem,
		update: (item: NotificationItem) => NotificationItem,
	) => {
		setNotifications((current) =>
			current.map((notification) =>
				notification.item.id === target.id
					? { ...notification, item: update(notification.item) }
					: notification,
			),
		)
	}

	return (
		<NotificationInboxPage
			state={state}
			category={category}
			list={list}
			canMarkAllRead={() =>
				notifications().some((notification) => notification.item.is_unread)
			}
			isUpdatingRead={() => false}
			isUpdatingSaved={() => false}
			loadMore={noop}
			retry={noop}
			setState={setState}
			setCategory={setCategory}
			setRead={(item, read) => {
				updateNotification(item, (current) => ({
					...current,
					is_unread: !read,
				}))
			}}
			setSaved={(item, saved) => {
				updateNotification(item, (current) => ({
					...current,
					saved_at: saved ? STORY_SAVED_AT : null,
				}))
			}}
			markAllRead={() => {
				setNotifications((current) =>
					current.map((notification) => ({
						...notification,
						item: { ...notification.item, is_unread: false },
					})),
				)
			}}
		/>
	)
}

const meta = {
	title: "Page/NotificationInboxPage",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: { layout: StoryLayout.FullScreen },
	argTypes: {
		listState: {
			control: { type: "select" },
			options: STORY_LIST_STATES,
		},
	},
	args: {
		listState: "loaded",
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Inbox: Story = {}
