import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { UserCollection } from "~/hey-api"
import { withStoryRouter } from "~/utils/adapter/storybook"
import { FollowedCollectionRow } from "~/view/collection/FollowedCollectionRow"

import { CollectionRow } from "./Profile"

const COLLECTION_ITEM: UserCollection = {
	id: 301,
	owner: {
		id: 1,
		name: "Hakurei Reimu",
		avatar_url: null,
	},
	name: "Example collection",
	description: "A compact row for profile collection lists.",
	is_public: true,
	item_count: 18,
	follower_count: 6,
	is_following: true,
	followed_at: "2026-05-20T12:00:00.000Z",
}

const meta = {
	title: "View/User/Profile/CollectionRow",
	component: CollectionRow,
	decorators: [withStoryRouter],
	args: {
		item: COLLECTION_ITEM,
	},
	render: (props) => (
		<div class="min-h-screen bg-secondary p-8">
			<ul class="max-w-2xl divide-y divide-slate-100 border-y border-slate-200 bg-primary">
				<CollectionRow item={props.item} />
			</ul>
		</div>
	),
} satisfies Meta<typeof CollectionRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Followed: Story = {
	render: (props: { item: UserCollection }) => (
		<div class="min-h-screen bg-secondary p-8">
			<ul class="max-w-2xl divide-y divide-slate-100 border-y border-slate-200 bg-primary">
				<FollowedCollectionRow item={props.item} />
			</ul>
		</div>
	),
}
