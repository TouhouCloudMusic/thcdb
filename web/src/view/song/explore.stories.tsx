import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import type { SongListItem } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { SongItem } from "~/view/song/SongItem"

const SONGS: SongListItem[] = [
	{
		id: 33,
		title: "月まで届け、不死の煙",
		cover_art_url: "/img/cover/release/1.png",
		artists: [
			{ id: 1, name: "Demetori" },
			{ id: 2, name: "ZUN" },
		],
		releases: [{ id: 81, title: "Il Mondo dove e finito il Tempo" }],
	},
	{
		id: 34,
		title: "Reincarnation ～ 幻想郷の二ッ岩による幻想的な弾幕音楽 Long Version",
		cover_art_url: null,
		artists: [
			{ id: 3, name: "凋叶棕" },
			{ id: 4, name: "RD-Sounds" },
			{ id: 5, name: "めらみぽっぷ" },
		],
		releases: [
			{ id: 82, title: "屠" },
			{ id: 83, title: "幻想音楽祭 Complete Archive" },
		],
	},
	{
		id: 35,
		title: "U.N.オーエンは彼女なのか？",
		cover_art_url: null,
		artists: [{ id: 2, name: "ZUN" }],
		releases: [],
	},
]

type StoryRootProps = {
	songs: SongListItem[]
	width: "full" | "narrow"
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div
			class={`mx-auto w-full bg-primary ${props.width === "narrow" ? "max-w-sm" : "max-w-3xl"}`}
		>
			<div class="flex flex-col gap-2 p-4">
				<Intersperse
					of={props.songs}
					with={<Divider horizontal />}
				>
					{(song) => <SongItem song={song} />}
				</Intersperse>
			</div>
		</div>
	)
}

const meta = {
	title: "View/Explore/Song",
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
	args: {
		songs: SONGS,
		width: "full",
	},
	argTypes: {
		songs: { control: false },
		width: {
			control: "select",
			options: ["full", "narrow"],
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const List: Story = {}

export const Narrow: Story = {
	args: { width: "narrow" },
}
