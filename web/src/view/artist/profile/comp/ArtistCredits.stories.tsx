import { mergeProps } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { ArtistCredits as ArtistCreditsData } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import {
	ARTIST_CREDITS_STORY_DATA,
	createArtistCreditsStoryModel,
} from "../credits.storybook"
import { ArtistCredits } from "./ArtistCredits"

type StoryRootProps = {
	data: Pick<ArtistCreditsData, "release" | "song">
	state: "ready" | "loading" | "empty" | "error" | "loading-more" | "page-error"
}

function StoryRoot(props: StoryRootProps) {
	const model = createArtistCreditsStoryModel(() => props.data)
	const preview = mergeProps(model, {
		get data() {
			return props.state === "empty" || props.state === "error"
				? { release: [], song: [] }
				: model.data
		},
		get isLoading() {
			return props.state === "loading"
		},
		get hasError() {
			return props.state === "error" || props.state === "page-error"
		},
		get hasNext() {
			return (
				(props.state === "ready"
					&& (model.data.release.length > 0 || model.data.song.length > 0))
				|| props.state === "loading-more"
				|| props.state === "page-error"
			)
		},
		get isFetchingNextPage() {
			return props.state === "loading-more"
		},
	})

	return <ArtistCredits model={preview} />
}

const meta = {
	title: "View/Artist/Credits",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: { layout: StoryLayout.FullScreen },
	args: { data: ARTIST_CREDITS_STORY_DATA, state: "ready" },
	argTypes: {
		data: { control: false },
		state: {
			control: "select",
			options: [
				"ready",
				"loading",
				"empty",
				"error",
				"loading-more",
				"page-error",
			],
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
