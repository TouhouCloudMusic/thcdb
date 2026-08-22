import { For } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { NotificationItem } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { NotificationCard } from "./NotificationCard"

function noop() {
	return undefined
}

const MOCK_NOTIFICATIONS = [
	{
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
	{
		id: "01900f01-aaaa-7000-8000-000000000011",
		body: {
			kind: "CommentReplied",
			container: {
				kind: "Correction",
				id: 12,
				name: "蓬莱人形 ～ Dolls in Pseudo Paradise",
			},
			reply: {
				state: "Deleted",
				actor: { id: 3, name: "bob" },
				created_at: "2026-06-20T08:41:00Z",
			},
		},

		is_unread: true,
		through_seq: "2",
		saved_at: null,
		created_at: "2026-06-20T08:41:00Z",
		last_activity_at: "2026-06-20T08:41:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000012",
		body: {
			kind: "CommentReplied",
			container: null,
			reply: {
				state: "Visible",
				id: 47,
				actor: { id: 8, name: "grace" },
				content: "The original thread is no longer available.",
				created_at: "2026-06-20T07:41:00Z",
			},
		},

		is_unread: false,
		through_seq: "3",
		saved_at: null,
		created_at: "2026-06-20T07:41:00Z",
		last_activity_at: "2026-06-20T07:41:00Z",
	},
	{
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
	{
		id: "01900f01-aaaa-7000-8000-000000000010",
		body: {
			kind: "CollectionFollowed",
			actor: { id: 5, name: "dave" },
			collection: {
				state: "Available",
				id: 7,
				title: "Touhou Essentials",
			},
		},

		is_unread: true,
		through_seq: "1",
		saved_at: null,
		created_at: "2026-06-19T08:00:00Z",
		last_activity_at: "2026-06-19T08:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000013",
		body: {
			kind: "CollectionFollowed",
			actor: { id: 8, name: "grace" },
			collection: {
				state: "Deleted",
			},
		},

		is_unread: false,
		through_seq: "2",
		saved_at: null,
		created_at: "2026-06-19T07:00:00Z",
		last_activity_at: "2026-06-19T07:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000003",
		body: {
			kind: "CorrectionModerated",
			actor: { id: 10, name: "moderator" },
			correction: {
				kind: "Correction",
				id: 12,
				name: "蓬莱人形 ～ Dolls in Pseudo Paradise",
			},
			action: "Approved",
		},

		is_unread: true,
		through_seq: "3",
		saved_at: null,
		created_at: "2026-06-18T08:30:00Z",
		last_activity_at: "2026-06-18T08:30:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000014",
		body: {
			kind: "CorrectionModerated",
			actor: { id: 10, name: "moderator" },
			correction: {
				kind: "Correction",
				id: 34,
				name: "大空魔術 ～ Magical Astronomy",
			},
			action: "Rejected",
		},

		is_unread: true,
		through_seq: "4",
		saved_at: null,
		created_at: "2026-06-18T08:00:00Z",
		last_activity_at: "2026-06-18T08:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000004",
		body: {
			kind: "CollectionItemAdded",
			actor: { id: 4, name: "carol" },
			collection: {
				state: "Available",
				id: 7,
				title: "Touhou Essentials",
			},
		},

		is_unread: true,
		through_seq: "1",
		saved_at: null,
		created_at: "2026-06-18T07:00:00Z",
		last_activity_at: "2026-06-18T07:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000015",
		body: {
			kind: "CollectionItemAdded",
			actor: { id: 9, name: "heidi" },
			collection: {
				state: "Restricted",
			},
		},

		is_unread: false,
		through_seq: "2",
		saved_at: null,
		created_at: "2026-06-18T06:00:00Z",
		last_activity_at: "2026-06-18T06:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000005",
		body: {
			kind: "ImageQueueModerated",
			actor: { id: 10, name: "moderator" },
			image_queue: {
				kind: "ImageQueue",
				id: 204,
				name: "Touhou 18",
			},
			image_type: "Cover",
			action: "Rejected",
		},

		is_unread: false,
		through_seq: "1",
		saved_at: null,
		created_at: "2026-06-17T12:00:00Z",
		last_activity_at: "2026-06-17T12:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000016",
		body: {
			kind: "ImageQueueModerated",
			actor: { id: 10, name: "moderator" },
			image_queue: {
				kind: "ImageQueue",
				id: 205,
				name: "Touhou 19",
			},
			image_type: "Profile",
			action: "Approved",
		},

		is_unread: true,
		through_seq: "2",
		saved_at: null,
		created_at: "2026-06-17T11:00:00Z",
		last_activity_at: "2026-06-17T11:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000017",
		body: {
			kind: "ImageQueueModerated",
			actor: { id: 10, name: "moderator" },
			image_queue: {
				kind: "ImageQueue",
				id: 206,
				name: "Touhou 17",
			},
			image_type: "Cover",
			action: "Reverted",
		},

		is_unread: false,
		through_seq: "3",
		saved_at: "2026-06-17T10:05:00Z",
		created_at: "2026-06-17T10:00:00Z",
		last_activity_at: "2026-06-17T10:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000006",
		body: {
			kind: "AccountRoleChanged",
			actor: { id: 1, name: "admin" },
			new_roles: ["Admin"],
		},

		is_unread: false,
		through_seq: "1",
		saved_at: null,
		created_at: "2026-06-16T15:00:00Z",
		last_activity_at: "2026-06-16T15:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000018",
		body: {
			kind: "AccountRoleChanged",
			actor: { id: 1, name: "admin" },
			new_roles: [],
		},

		is_unread: false,
		through_seq: "2",
		saved_at: null,
		created_at: "2026-06-16T14:00:00Z",
		last_activity_at: "2026-06-16T14:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000007",
		body: {
			kind: "CorrectionReviewRequested",
			actor: { id: 4, name: "carol" },
			correction: {
				kind: "Correction",
				id: 33,
				name: "蓮台野夜行 ～ Ghostly Field Club",
			},
		},

		is_unread: true,
		through_seq: "1",
		saved_at: null,
		created_at: "2026-06-16T09:00:00Z",
		last_activity_at: "2026-06-16T09:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000008",
		body: {
			kind: "CorrectionUpdated",
			actor: { id: 4, name: "carol" },
			correction: {
				kind: "Correction",
				id: 33,
				name: "蓮台野夜行 ～ Ghostly Field Club",
			},
		},

		is_unread: true,
		through_seq: "2",
		saved_at: null,
		created_at: "2026-06-16T08:30:00Z",
		last_activity_at: "2026-06-16T08:30:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000009",
		body: {
			kind: "CommentThreadUpdated",
			container: {
				kind: "Correction",
				id: 12,
				name: "蓬莱人形 ～ Dolls in Pseudo Paradise",
			},
			commenters: [
				{ id: 6, name: "ellen" },
				{ id: 7, name: "frank" },
			],
			additional_commenter_count: 0,
			latest: {
				state: "Visible",
				id: 93,
				actor: { id: 6, name: "ellen" },
				content: "I added more context.",
				created_at: "2026-06-15T18:00:00Z",
			},
		},

		is_unread: true,
		through_seq: "3",
		saved_at: null,
		created_at: "2026-06-15T18:00:00Z",
		last_activity_at: "2026-06-15T18:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000019",
		body: {
			kind: "CommentThreadUpdated",
			container: null,
			commenters: [{ id: 8, name: "grace" }],
			additional_commenter_count: 1,
			latest: {
				state: "Deleted",
				actor: { id: 8, name: "grace" },
				created_at: "2026-06-15T17:00:00Z",
			},
		},

		is_unread: true,
		through_seq: "4",
		saved_at: null,
		created_at: "2026-06-15T17:00:00Z",
		last_activity_at: "2026-06-15T17:00:00Z",
	},
	{
		id: "01900f01-aaaa-7000-8000-000000000020",
		body: {
			kind: "CommentThreadUpdated",
			container: {
				kind: "Correction",
				id: 33,
				name: "蓮台野夜行 ～ Ghostly Field Club",
			},
			commenters: [
				{ id: 9, name: "heidi" },
				{ id: 10, name: "ivan" },
				{ id: 11, name: "judy" },
			],
			additional_commenter_count: 2,
			latest: {
				state: "Visible",
				id: 95,
				actor: { id: 9, name: "heidi" },
				content: "I found two more references.",
				created_at: "2026-06-15T16:00:00Z",
			},
		},

		is_unread: false,
		through_seq: "5",
		saved_at: null,
		created_at: "2026-06-15T16:00:00Z",
		last_activity_at: "2026-06-15T16:00:00Z",
	},
] satisfies NotificationItem[]

const NOW = Date.parse("2026-06-25T14:00:00Z")

const meta = {
	title: "View/Notification/NotificationCard",
	component: NotificationCard,
	decorators: [withStoryRouter],
	parameters: { layout: StoryLayout.Padded },
} satisfies Meta<typeof NotificationCard>

export default meta

export const List: StoryObj = {
	render: () => (
		<div class="max-w-2xl divide-y divide-slate-200 bg-primary">
			<For each={MOCK_NOTIFICATIONS}>
				{(item) => (
					<NotificationCard
						item={item}
						now={NOW}
						setRead={noop}
						setSaved={noop}
						isUpdatingRead={item.id === "01900f01-aaaa-7000-8000-000000000014"}
						isUpdatingSaved={item.id === "01900f01-aaaa-7000-8000-000000000017"}
					/>
				)}
			</For>
		</div>
	),
}
