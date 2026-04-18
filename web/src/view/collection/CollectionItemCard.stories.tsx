import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withStoryRouter } from "~/utils/adapter/storybook"

import { CollectionItemCard } from "./CollectionItemCard"

const meta = {
	title: "View/Collection/CollectionItemCard",
	component: CollectionItemCard,
	decorators: [withStoryRouter],
	tags: ["autodocs"],
	argTypes: {
		isEditing: { control: "boolean" },
		isDeleting: { control: "boolean" },
		isReordering: { control: "boolean" },
		canMoveUp: { control: "boolean" },
		canMoveDown: { control: "boolean" },
	},
	args: {
		isEditing: false,
		isDeleting: false,
		isReordering: false,
		canMoveUp: false,
		canMoveDown: false,
		onDelete: () => undefined,
		onMoveUp: () => undefined,
		onMoveDown: () => undefined,
	},
} satisfies Meta<typeof CollectionItemCard>

export default meta
type Story = StoryObj<typeof meta>

export const ArtistItem: Story = {
	args: {
		isEditing: true,
		canMoveDown: true,
		item: {
			id: 1,
			position: 0,
			entity_type: "Artist",
			entity_id: 1,
			description: "One of my favorite artists.",
			entity: {
				entity_type: "Artist",
				id: 1,
				name: "Hakurei Reimu",
				artist_type: "Solo",
				profile_image_url: null,
			},
		},
	},
}

export const ReleaseItem: Story = {
	args: {
		item: {
			id: 2,
			position: 1,
			entity_type: "Release",
			entity_id: 2,
			description: "A classic album.",
			entity: {
				entity_type: "Release",
				id: 2,
				title: "Perfect Cherry Blossom",
				release_type: "Album",
				release_date: { value: "2003-08-17", precision: "Day" },
				cover_art_url: null,
				artists: [{ id: 1, name: "ZUN" }],
			},
		},
	},
}

export const SongItem: Story = {
	args: {
		isEditing: true,
		canMoveUp: true,
		canMoveDown: true,
		item: {
			id: 3,
			position: 2,
			entity_type: "Song",
			entity_id: 3,
			description: null,
			entity: {
				entity_type: "Song",
				id: 3,
				title: "Necrofantasia",
				artists: [{ id: 1, name: "ZUN" }],
				cover_art_url: null,
			},
		},
	},
}

export const EventItem: Story = {
	args: {
		isEditing: true,
		canMoveUp: true,
		item: {
			id: 4,
			position: 3,
			entity_type: "Event",
			entity_id: 4,
			description: "Awesome event",
			entity: {
				entity_type: "Event",
				id: 4,
				name: "Comiket 64",
				start_date: { value: "2003-08-15", precision: "Day" },
			},
		},
	},
}

export const TagItem: Story = {
	args: {
		item: {
			id: 5,
			position: 4,
			entity_type: "Tag",
			entity_id: 5,
			description: null,
			entity: {
				entity_type: "Tag",
				id: 5,
				name: "Rock",
				tag_type: "Genre",
			},
		},
	},
}

export const LabelItem: Story = {
	args: {
		item: {
			id: 6,
			position: 5,
			entity_type: "Label",
			entity_id: 6,
			description: null,
			entity: {
				entity_type: "Label",
				id: 6,
				name: "Touhou Records",
			},
		},
	},
}
