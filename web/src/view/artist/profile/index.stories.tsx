import type { Artist, ArtistCredit, Discography, ReleaseType } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { MOCK_CORRECTION_HISTORY } from "~/mock/correction"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import {
	DAYBREAK_COVER_URL,
	TOHOHUM_COVER_URL,
	YABBA_RAGGA_TOHO_3_COVER_URL,
} from "~/storybook/fixtures"
import type { InfiniteQuery } from "~/type/query"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ArtistProfilePage } from "."

const ARTIST: Artist = {
	id: 18,
	name: "Rolling Contact",
	artist_type: "Multiple",
	profile_image_url: YABBA_RAGGA_TOHO_3_COVER_URL,
	start_date: { precision: "Year", value: "2008-01-01" },
	start_location: { country: "Japan", province: "Tokyo", city: "Tokyo" },
	current_location: { country: "Japan", province: "Tokyo", city: "Tokyo" },
	text_aliases: ["ローリング・コンタクト", "Rolling Contact Records"],
	memberships: [
		{
			artist_id: 41,
			roles: [{ id: 1, name: "Arrangement" }],
			tenure: [{ join_year: 2008, leave_year: null }],
		},
		{
			artist_id: 42,
			roles: [{ id: 2, name: "Production" }],
			tenure: [{ join_year: 2012, leave_year: null }],
		},
	],
	links: [
		"https://touhoudb.com/Al/2522",
		"https://rollingcontact.bandcamp.com/",
	],
}

const RELEASES = {
	Album: [
		{
			release_id: 101,
			title: "Yabba Ragga Toho 3",
			release_type: "Album",
			release_date: { precision: "Day", value: "2020-03-22" },
			artist: [{ id: ARTIST.id, name: ARTIST.name }],
			cover_url: YABBA_RAGGA_TOHO_3_COVER_URL,
		},
		{
			release_id: 102,
			title: "TOHOHUM",
			release_type: "Album",
			release_date: { precision: "Year", value: "2008-01-01" },
			artist: [
				{ id: 52, name: "石鹸屋" },
				{ id: ARTIST.id, name: ARTIST.name },
			],
			cover_url: TOHOHUM_COVER_URL,
		},
	],
	Compilation: [
		{
			release_id: 103,
			title: "Daybreak",
			release_type: "Compilation",
			release_date: { precision: "Day", value: "2018-07-28" },
			artist: [{ id: 53, name: "Higan Daybreak" }],
			cover_url: DAYBREAK_COVER_URL,
		},
	],
	Demo: [
		{
			release_id: 104,
			title: "Rolling Contact Preview Disc",
			release_type: "Demo",
			release_date: { precision: "Year", value: "2020-01-01" },
			artist: [{ id: ARTIST.id, name: ARTIST.name }],
			cover_url: YABBA_RAGGA_TOHO_3_COVER_URL,
		},
	],
	Ep: [
		{
			release_id: 105,
			title: "Moon and Jungle EP",
			release_type: "Ep",
			release_date: { precision: "Month", value: "2023-10-01" },
			artist: [{ id: ARTIST.id, name: ARTIST.name }],
			cover_url: TOHOHUM_COVER_URL,
		},
	],
	Other: [
		{
			release_id: 106,
			title: "Reitaisai Limited Mixes",
			release_type: "Other",
			release_date: { precision: "Year", value: "2022-01-01" },
			artist: [{ id: ARTIST.id, name: ARTIST.name }],
			cover_url: DAYBREAK_COVER_URL,
		},
	],
	Single: [
		{
			release_id: 107,
			title: "Island Girl",
			release_type: "Single",
			release_date: { precision: "Day", value: "2020-03-22" },
			artist: [{ id: ARTIST.id, name: ARTIST.name }],
			cover_url: YABBA_RAGGA_TOHO_3_COVER_URL,
		},
	],
} satisfies Record<ReleaseType, Discography[]>

const APPEARANCES: Discography[] = [
	{
		release_id: 201,
		title: "Daybreak",
		release_type: "Compilation",
		release_date: { precision: "Day", value: "2018-07-28" },
		artist: [{ id: 53, name: "Higan Daybreak" }],
		cover_url: DAYBREAK_COVER_URL,
	},
]

const CREDITS: ArtistCredit[] = [
	{
		release_id: 301,
		title: "TOHOHUM",
		release_type: "Album",
		release_date: { precision: "Year", value: "2008-01-01" },
		artist: [{ id: 52, name: "石鹸屋" }],
		roles: [
			{ id: 1, name: "Arrangement" },
			{ id: 3, name: "Mixing" },
		],
		cover_url: TOHOHUM_COVER_URL,
	},
]

async function noop() {
	await Promise.resolve()
}

function createInfiniteQuery<T>(data: T[]): InfiniteQuery<T> {
	return {
		data,
		hasNext: false,
		next: noop,
		isLoading: false,
	}
}

function StoryRoot() {
	return (
		<div class="min-h-[900px] bg-slate-100 p-6">
			<ArtistProfilePage
				artist={ARTIST}
				correctionHistory={MOCK_CORRECTION_HISTORY}
				appearances={createInfiniteQuery(APPEARANCES)}
				discographies={{
					data: RELEASES,
					hasNext: () => false,
					next: noop,
					isLoading: false,
				}}
				credits={createInfiniteQuery(CREDITS)}
			/>
		</div>
	)
}

const meta = {
	title: "View/Artist",
	component: StoryRoot,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
