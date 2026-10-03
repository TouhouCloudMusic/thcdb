import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { EditArtistPage } from "~/view/artist/edit"
import { EditEventPage } from "~/view/event/edit"
import { EditReleasePage } from "~/view/release/edit"
import { EditSongPage } from "~/view/song/edit"

const meta = {
	title: "View/Entity/Edit",
	component: EditSongPage,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: { layout: StoryLayout.FullScreen },
	args: { type: "new" },
} satisfies Meta<typeof EditSongPage>

export default meta
type Story = StoryObj<typeof meta>
export const Song: Story = {}
export const Artist: Story = { render: () => <EditArtistPage type="new" /> }
export const Release: Story = { render: () => <EditReleasePage type="new" /> }
export const Event: Story = { render: () => <EditEventPage type="new" /> }
