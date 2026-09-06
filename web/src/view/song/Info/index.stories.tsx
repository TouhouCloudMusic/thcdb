import type { CorrectionHistoryItem, Song } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import {
	DAYBREAK_COVER_URL,
	ENGLISH_LANGUAGE,
	TOHOHUM_COVER_URL,
	YABBA_RAGGA_TOHO_3_COVER_URL,
} from "~/storybook/fixtures"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { SongInfoPage } from "~/view/song/Info"

const FULL_SONG: Song = {
	id: 42,
	title: "Island Girl",
	artists: [
		{ id: 18, name: "Rolling Contact" },
		{ id: 41, name: "天音" },
	],
	releases: [
		{
			id: 101,
			title: "Yabba Ragga Toho 3",
			track_number: "01",
			cover_art_url: YABBA_RAGGA_TOHO_3_COVER_URL,
		},
		{
			id: 103,
			title: "TOHOHUM",
			track_number: "07",
			cover_art_url: TOHOHUM_COVER_URL,
		},
		{
			id: 102,
			title: "Daybreak",
			track_number: "12",
			cover_art_url: DAYBREAK_COVER_URL,
		},
	],
	credits: [
		{
			artist: { id: 1, name: "ZUN" },
			role: { id: 1, name: "Original Composer" },
		},
		{
			artist: { id: 41, name: "天音" },
			role: { id: 2, name: "Arranger" },
		},
		{
			artist: { id: 18, name: "Rolling Contact" },
			role: { id: 3, name: "Production" },
		},
	],
	languages: [{ id: 1, code: "ja", name: "Japanese" }, ENGLISH_LANGUAGE],
	localized_titles: [
		{
			language: { id: 1, code: "ja", name: "Japanese" },
			title: "アイランド・ガール",
		},
		{
			language: ENGLISH_LANGUAGE,
			title: "Island Girl",
		},
	],
	lyrics: [
		{
			id: 1,
			song_id: 42,
			content: `月明かりを追い越して
遠い幻想の向こうへ
重なる鼓動を聴きながら
夜明けまで踊り続ける`,
			is_main: true,
			language: { id: 1, code: "ja", name: "Japanese" },
		},
		{
			id: 2,
			song_id: 42,
			content: `Outrunning the moonlight
Beyond the distant fantasy
Listening to our rhythms converge
We keep dancing until dawn`,
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
			artist: { id: 52, name: "Higan Daybreak" },
			type: { id: 2, name: "Remix" },
			description: "",
		},
	],
	links: [
		"https://example.com/songs/42",
		"https://archive.example.com/tracks/42",
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
	links: [],
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
	title: "View/Song",
	component: StoryRoot,
	decorators: [withEntityDetailStoryState, withStoryRouter],
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
