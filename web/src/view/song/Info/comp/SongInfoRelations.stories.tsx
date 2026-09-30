import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { SONG_INFO_RELATIONS } from "~/storybook/fixtures"
import { withStoryRouter } from "~/utils/adapter/storybook"
import { SongInfoRelations } from "~/view/song/Info/comp/SongInfoRelations"

const meta = {
	title: "View/Song/Relations",
	component: SongInfoRelations,
	decorators: [withStoryRouter],
} satisfies Meta<typeof SongInfoRelations>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		relations: SONG_INFO_RELATIONS,
	},
}
