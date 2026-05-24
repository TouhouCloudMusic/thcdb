import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { UserCollection } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import type {
	CollectionDetailController,
	CollectionDetailModel,
} from "~/view/collection/CollectionDetail"
import { CollectionDetailPage } from "~/view/collection/CollectionDetail"
import type { UserCollectionItemDetail } from "~/view/collection/CollectionItemCard"

const MOCK_OWNER_NAME = "Hakurei Reimu"

const MOCK_LIST: UserCollection = {
	id: 1,
	name: "My Favorites",
	description: "A curated collection of my favorite items in the database.",
	is_public: true,
	item_count: 6,
	follower_count: 3,
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
	isFollowingCollection: boolean
	isFollowingCollectionPending: boolean
}

function noopControllerAction() {
	return undefined
}

const COLLECTION_DETAIL_CONTROLLER: CollectionDetailController = {
	retryItems: noopControllerAction,
	loadMoreItems: noopControllerAction,
	deleteCollection: noopControllerAction,
	deleteItem: noopControllerAction,
	reorderItems: noopControllerAction,
	toggleFollow: noopControllerAction,
}

function StoryRoot(props: StoryRootProps) {
	const collection = () => ({
		...MOCK_LIST,
		is_following:
			props.scenario === "visitor" ? props.isFollowingCollection : undefined,
	})
	const viewer = (): CollectionDetailModel["viewer"] => {
		if (props.scenario === "owner") {
			return {
				role: "owner",
				isDeletingCollection: props.isDeletingCollection,
				isDeletingItem: props.isDeletingItem,
				isReorderingItems: props.isReorderingItems,
			}
		}

		return {
			role: "visitor",
			isFollowing: props.isFollowingCollection,
			isTogglingFollow: props.isFollowingCollectionPending,
		}
	}

	const itemsFetchState = (): CollectionDetailModel["items"] => {
		switch (props.itemsScenario) {
			case "loading": {
				return { status: "loading" }
			}
			case "error": {
				return { status: "error" }
			}
			case "empty": {
				return {
					status: "success",
					items: [],
					isFetchingMore: false,
					hasMore: false,
				}
			}
			case "has-more": {
				return {
					status: "success",
					items: MOCK_ITEMS,
					isFetchingMore: false,
					hasMore: true,
				}
			}
			case "loaded": {
				return {
					status: "success",
					items: MOCK_ITEMS,
					isFetchingMore: false,
					hasMore: false,
				}
			}
			default: {
				return { status: "loading" }
			}
		}
	}
	const model = (): CollectionDetailModel => ({
		collection: collection(),
		items: itemsFetchState(),
		viewer: viewer(),
	})

	return (
		<div class="size-full bg-slate-100">
			<div class="mx-auto h-full max-w-6xl border-x border-slate-300 bg-white p-8 pt-6 2xl:max-w-7xl">
				<CollectionDetailPage
					model={model()}
					controller={COLLECTION_DETAIL_CONTROLLER}
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
	isFollowingCollection: false,
	isFollowingCollectionPending: false,
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
		isFollowingCollection: { control: { type: "boolean" } },
		isFollowingCollectionPending: { control: { type: "boolean" } },
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
