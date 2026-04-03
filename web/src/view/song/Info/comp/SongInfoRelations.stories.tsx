import type { Song } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withStoryRouter } from "~/utils/adapter/storybook"
import { SongInfoRelations } from "~/view/song/Info/comp/SongInfoRelations"

const MOCK_RELATIONS: Song["relations"] = [
	{
		song: { id: 100, title: "U.N. Owen Was Her?" },
		artist: { id: 1, name: "ZUN" },
		type: { id: 1, name: "Original" },
		description: "Primary melodic source for this arrangement.",
	},
	{
		song: { id: 101, title: "Locked Girl" },
		artist: { id: 2, name: "EoSD Sound Team" },
		type: { id: 2, name: "Remix" },
		description: "",
	},
]

const meta = {
	title: "View/Song/Info/Relations",
	component: SongInfoRelations,
	decorators: [withStoryRouter],
} satisfies Meta<typeof SongInfoRelations>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		relations: MOCK_RELATIONS,
	},
}
