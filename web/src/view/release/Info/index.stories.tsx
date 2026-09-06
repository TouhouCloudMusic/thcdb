import type { Release } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { MOCK_CORRECTION_HISTORY } from "~/mock/correction"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { YABBA_RAGGA_TOHO_3_COVER_URL } from "~/storybook/fixtures"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ReleaseInfoPage } from "."

const RELEASE: Release = {
	id: 101,
	title: "Yabba Ragga Toho 3",
	release_type: "Album",
	artists: [
		{ id: 18, name: "Rolling Contact" },
		{ id: 41, name: "天音" },
	],
	cover_art_url: YABBA_RAGGA_TOHO_3_COVER_URL,
	release_date: { precision: "Day", value: "2020-03-22" },
	recording_date_start: { precision: "Month", value: "2019-08-01" },
	recording_date_end: { precision: "Month", value: "2020-02-01" },
	catalog_nums: [
		{
			catalog_number: "LOLI-0085",
			label: { id: 9, name: "Rolling Contact" },
		},
		{ catalog_number: "RC-2020-03", label: null },
	],
	localized_titles: [
		{
			language: { id: 1, code: "ja", name: "Japanese" },
			title: "ヤバラガ東方3",
		},
	],
	events: [
		{ id: 31, name: "Hakurei Shrine Reitaisai 17" },
		{ id: 32, name: "Air Reitaisai 2020" },
	],
	discs: [
		{ id: 1, name: "Main Disc" },
		{ id: 2, name: "Extended Mixes" },
	],
	tracks: [
		{
			id: 1,
			disc_id: 1,
			track_number: "01",
			display_title: "Island Girl",
			duration: 267000,
			song: { id: 401, title: "Island Girl" },
			artists: [{ id: 41, name: "天音" }],
		},
		{
			id: 2,
			disc_id: 1,
			track_number: "02",
			display_title: null,
			duration: 310000,
			song: { id: 402, title: "Tomboy Gangsta (Bigroom Remix)" },
			artists: [{ id: 41, name: "天音" }],
		},
		{
			id: 3,
			disc_id: 1,
			track_number: "03",
			display_title: "(No) Way Out",
			duration: 320000,
			song: { id: 403, title: "(No) Way Out" },
			artists: [{ id: 41, name: "天音" }],
		},
		{
			id: 4,
			disc_id: 2,
			track_number: "01",
			display_title: "Tyto Alba (Original Mix)",
			duration: 308000,
			song: { id: 404, title: "Tyto Alba" },
			artists: [{ id: 41, name: "天音" }],
		},
	],
	credits: [
		{
			artist: { id: 41, name: "天音" },
			role: { id: 1, name: "Arrangement" },
			on: [1, 2, 4],
		},
		{
			artist: { id: 42, name: "神楽坂いろは" },
			role: { id: 2, name: "Illustration" },
			on: [2, 3],
		},
		{
			artist: { id: 43, name: "ZUN" },
			role: { id: 3, name: "Original Composition" },
			on: [1],
		},
	],
}

function StoryRoot() {
	return (
		<div class="min-h-[900px] bg-slate-100 p-6">
			<ReleaseInfoPage
				release={RELEASE}
				correctionHistory={MOCK_CORRECTION_HISTORY}
			/>
		</div>
	)
}

const meta = {
	title: "View/Release",
	component: StoryRoot,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
