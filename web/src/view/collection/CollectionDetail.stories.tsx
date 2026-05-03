import { createEffect } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { UserCollection, UserProfile } from "~/hey-api"
import { useCurrentUser } from "~/state/user"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import type { ItemsFetchState } from "~/view/collection/CollectionDetail"
import { CollectionDetailPage } from "~/view/collection/CollectionDetail"
import type { UserCollectionItemDetail } from "~/view/collection/CollectionItemCard"

const MOCK_OWNER_NAME = "Hakurei Reimu"

const MOCK_OWNER_USER: UserProfile = {
	name: MOCK_OWNER_NAME,
	last_login: "2026-01-01T00:00:00.000Z",
	stats: {
		edit_count: 42,
		vote_count: 17,
	},
}

const MOCK_LIST: UserCollection = {
	id: 1,
	name: "My Favorites",
	description: "A curated collection of my favorite items in the database.",
	is_public: true,
	item_count: 6,
	owner: { id: 1, name: MOCK_OWNER_NAME },
}

const MOCK_ITEMS: UserCollectionItemDetail[] = [
	{
		id: 1,
		entity_id: 12,
		entity_type: "Artist",
		position: 0,
		description: "My favorite circle — incredible arrangement style.",
		entity: {
			entity_type: "Artist",
			id: 12,
			name: "Hakurei Reimu",
			artist_type: "Solo",
			profile_image_url: null,
		},
	},
	{
		id: 2,
		entity_id: 35,
		entity_type: "Label",
		position: 1,
		entity: {
			entity_type: "Label",
			id: 35,
			name: "Touhou Records",
		},
	},
	{
		id: 3,
		entity_id: 78,
		entity_type: "Release",
		position: 2,
		description:
			"Amazing album, highly recommended to anyone new to the genre.",
		entity: {
			entity_type: "Release",
			id: 78,
			title: "Perfect Cherry Blossom",
			release_type: "Album",
			release_date: { value: "2003-08-17", precision: "Day" },
			cover_art_url: null,
			artists: [{ id: 1, name: "ZUN" }],
		},
	},
	{
		id: 4,
		entity_id: 204,
		entity_type: "Song",
		position: 3,
		entity: {
			entity_type: "Song",
			id: 204,
			title: "Necrofantasia",
			artists: [{ id: 1, name: "ZUN" }],
			cover_art_url: null,
		},
	},
	{
		id: 5,
		entity_id: 9,
		entity_type: "Tag",
		position: 4,
		description: "Genre I keep coming back to.",
		entity: {
			entity_type: "Tag",
			id: 9,
			name: "Rock",
			tag_type: "Genre",
		},
	},
	{
		id: 6,
		entity_id: 52,
		entity_type: "Event",
		position: 5,
		entity: {
			entity_type: "Event",
			id: 52,
			name: "Comiket 64",
			start_date: { value: "2003-08-15", precision: "Day" },
		},
	},
]

type ItemsScenario = "loading" | "error" | "empty" | "loaded" | "has-more"

type StoryRootProps = {
	scenario: "owner" | "visitor"
	itemsScenario: ItemsScenario
	isDeletingCollection: boolean
	isDeletingItem: boolean
	isReorderingItems: boolean
}

function StoryRoot(props: StoryRootProps) {
	const userCtx = useCurrentUser()

	createEffect(() => {
		if (props.scenario === "owner") {
			userCtx.sign_in({ user: MOCK_OWNER_USER })
		} else {
			userCtx.sign_in(undefined)
		}
	})

	const itemsFetchState = (): ItemsFetchState => {
		switch (props.itemsScenario) {
			case "loading": {
				return { status: "loading" }
			}
			case "error": {
				return { status: "error", onRetry: () => undefined }
			}
			case "empty": {
				return {
					status: "success",
					items: [],
					isFetchingMore: false,
					hasMore: false,
					onLoadMore: () => undefined,
				}
			}
			case "has-more": {
				return {
					status: "success",
					items: MOCK_ITEMS,
					isFetchingMore: false,
					hasMore: true,
					onLoadMore: () => undefined,
				}
			}
			case "loaded": {
				return {
					status: "success",
					items: MOCK_ITEMS,
					isFetchingMore: false,
					hasMore: false,
					onLoadMore: () => undefined,
				}
			}
			default: {
				return { status: "loading" }
			}
		}
	}

	return (
		<div class="size-full bg-slate-100">
			<div class="mx-auto h-full max-w-6xl border-x border-slate-300 bg-white p-8 pt-6 2xl:max-w-7xl">
				<CollectionDetailPage
					collection={MOCK_LIST}
					itemsFetchState={itemsFetchState()}
					isDeletingCollection={props.isDeletingCollection}
					isDeletingItem={props.isDeletingItem}
					isReorderingItems={props.isReorderingItems}
					onDeleteCollection={() => undefined}
					onDeleteItem={() => undefined}
					onReorderItems={() => undefined}
				/>
			</div>
		</div>
	)
}

const DEFAULT_ARGS: StoryRootProps = {
	scenario: "owner",
	itemsScenario: "loaded",
	isDeletingCollection: false,
	isDeletingItem: false,
	isReorderingItems: false,
}

const meta = {
	title: "View/Collection/CollectionDetail",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
		backgrounds: {
			grid: {
				disable: true,
			},
		},
	},
	globals: {
		backgrounds: {
			value: "studio",
		},
	},
	argTypes: {
		scenario: {
			control: { type: "radio" },
			options: ["owner", "visitor"],
		},
		itemsScenario: {
			control: { type: "select" },
			options: [
				"loading",
				"error",
				"empty",
				"loaded",
				"has-more",
			] satisfies ItemsScenario[],
		},
		isDeletingCollection: { control: { type: "boolean" } },
		isDeletingItem: { control: { type: "boolean" } },
		isReorderingItems: { control: { type: "boolean" } },
	},
	args: DEFAULT_ARGS,
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Owner: Story = {
	args: {
		scenario: "owner",
	},
}

export const Visitor: Story = {
	args: {
		scenario: "visitor",
	},
}
