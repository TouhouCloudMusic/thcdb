import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { UserCollection } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { colors, px } from "~/style/tokens.stylex"
import { withStoryRouter } from "~/utils/adapter/storybook"
import { FollowedCollectionRow } from "~/view/collection/FollowedCollectionRow"

import { CollectionRow } from "./Profile"

const styles = stylex.create({
	shell: {
		minHeight: "100vh",
		backgroundColor: colors.backgroundSecondary,
		padding: px[32],
	},
	list: {
		maxWidth: px[672],
		borderBlockWidth: "1px",
		borderBlockStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: colors.backgroundPrimary,
	},
	row: {
		borderBottomWidth: { default: "1px", ":last-child": 0 },
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[100],
	},
})

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
		<div {...stylex.attrs(styles.shell)}>
			<ul {...stylex.attrs(styles.list)}>
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
		<div {...stylex.attrs(styles.shell)}>
			<ul {...stylex.attrs(styles.list)}>
				<FollowedCollectionRow
					item={props.item}
					styles={styles.row}
				/>
			</ul>
		</div>
	),
}
