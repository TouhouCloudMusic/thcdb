import type { CorrectionHistoryItem, Song } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { ENGLISH_LANGUAGE } from "~/storybook/fixtures"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { SongInfoPage } from "~/view/song/Info"

const FULL_SONG: Song = {
	id: 42,
	title: "幻想郷の夜明け",
	artists: [
		{ id: 1, name: "ZUN" },
		{ id: 2, name: "Alstroemeria Records" },
		{ id: 3, name: "IOSYS" },
	],
	releases: [
		{
			id: 1,
			title: "東方紅魔郷 ～ the Embodiment of Scarlet Devil",
			cover_art_url: "https://picsum.photos/400/400?random=31",
		},
		{
			id: 2,
			title: "東方妖々夢 ～ Perfect Cherry Blossom",
			cover_art_url: "https://picsum.photos/400/400?random=32",
		},
		{
			id: 3,
			title: "東方永夜抄 ～ Imperishable Night",
			cover_art_url: "https://picsum.photos/400/400?random=33",
		},
	],
	credits: [
		{
			artist: { id: 1, name: "ZUN" },
			role: { id: 1, name: "Original Composer" },
		},
		{
			artist: { id: 2, name: "Alstroemeria Records" },
			role: { id: 2, name: "Arranger" },
		},
		{
			artist: { id: 3, name: "IOSYS" },
			role: { id: 3, name: "Vocal Arranger" },
		},
	],
	languages: [{ id: 1, code: "ja", name: "Japanese" }, ENGLISH_LANGUAGE],
	localized_titles: [
		{
			language: { id: 1, code: "ja", name: "Japanese" },
			title: "幻想郷の夜明け",
		},
		{
			language: ENGLISH_LANGUAGE,
			title: "Dawn of Gensokyo",
		},
	],
	lyrics: [
		{
			id: 1,
			song_id: 42,
			content: `東の空に光が差して
長い夜は終わりを告げる
霧の向こうで目覚める世界
新しい旋律が始まる`,
			is_main: true,
			language: { id: 1, code: "ja", name: "Japanese" },
		},
		{
			id: 2,
			song_id: 42,
			content: `The eastern sky begins to glow
The long night gives way
Across the mist a world awakens
And a new melody begins`,
			is_main: false,
			language: ENGLISH_LANGUAGE,
		},
	],
	relations: [
		{
			song: { id: 100, title: "U.N. Owen Was Her?" },
			artist: { id: 1, name: "ZUN" },
			type: { id: 1, name: "Original" },
			description: "Primary melodic source for this arrangement.",
		},
		{
			song: { id: 101, title: "Locked Girl" },
			artist: { id: 4, name: "dBu music" },
			type: { id: 2, name: "Remix" },
			description: "",
		},
	],
}

const SPARSE_SONG: Song = {
	...FULL_SONG,
	id: 43,
	title: "Silent Dawn",
	artists: [{ id: 4, name: "Demetori" }],
	releases: [],
	credits: [],
	languages: [ENGLISH_LANGUAGE],
	localized_titles: [],
	lyrics: [],
	relations: [],
}

const CORRECTION_HISTORY: CorrectionHistoryItem[] = [
	{
		id: 1,
		type: "Update",
		created_at: "2026-03-28T04:30:00.000Z",
		handled_at: "2026-03-28T05:10:00.000Z",
		author: { id: 1, name: "Hakurei Reimu" },
		description: "Adjusted release links and localized titles.",
	},
	{
		id: 2,
		type: "Create",
		created_at: "2026-03-27T09:15:00.000Z",
		handled_at: "2026-03-27T09:45:00.000Z",
		author: { id: 2, name: "Kirisame Marisa" },
		description: "Created the initial song entry.",
	},
	{
		id: 3,
		type: "Update",
		created_at: "2026-03-29T11:02:00.000Z",
		handled_at: null,
		author: { id: 1, name: "Hakurei Reimu" },
		description: "Pending correction shown to demonstrate count state.",
	},
]

type DisplayMode = "full" | "sparse"

type StoryRootProps = {
	displayMode: DisplayMode
}

function StoryRoot(props: StoryRootProps) {
	const song = () => (props.displayMode === "full" ? FULL_SONG : SPARSE_SONG)
	const correctionHistory = () =>
		props.displayMode === "full" ? CORRECTION_HISTORY : []

	return (
		<div class="min-h-[900px] bg-slate-100 p-6">
			<SongInfoPage
				song={song()}
				correctionHistory={correctionHistory()}
			/>
		</div>
	)
}

const meta = {
	title: "View/Song/Info",
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
	argTypes: {
		displayMode: {
			control: { type: "radio" },
			options: ["full", "sparse"] satisfies DisplayMode[],
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		displayMode: "full",
	},
}
