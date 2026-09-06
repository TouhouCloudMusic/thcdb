import { Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import { ExplorePageLayout } from "~/component/feature/entity_explore"
import type { ReleaseListItem } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { ReleaseItem, ReleaseGridItem } from "~/view/release/ReleaseItems"

const RELEASES: ReleaseListItem[] = [
	{
		id: 31,
		title: "緋色の鼓動",
		release_type: "Album",
		cover_art_url: "/img/cover/release/1.png",
		release_date: { precision: "Day", value: "2025-08-17" },
		catalog_numbers: ["SH-2025-01", "709-0817", "RB-17"],
		artists: [
			{ id: 1, name: "SOUND HOLIC" },
			{ id: 2, name: "Nana Takahashi" },
			{ id: 3, name: "709sec." },
		],
	},
	{
		id: 33,
		title:
			"東方アレンジ活性化大作戦！The Long Night of Gensokyo Complete Collection",
		release_type: "Compilation",
		cover_art_url: null,
		release_date: { precision: "Year", value: "2023-01-01" },
		artists: [
			{ id: 4, name: "IOSYS" },
			{ id: 5, name: "COOL&CREATE" },
			{ id: 6, name: "豚乙女" },
		],
		catalog_numbers: ["IO-0328", "CCCD-0062", "GCH-001"],
	},
	{
		id: 34,
		title: "蓬莱人形 ～ Dolls in Pseudo Paradise",
		release_type: "Album",
		cover_art_url: null,
		release_date: null,
		artists: [{ id: 7, name: "上海アリス幻樂団" }],
		catalog_numbers: [],
	},
]

type StoryRootProps = {
	releases: ReleaseListItem[]
	width: "full" | "narrow"
}

function ReleaseListStoryRoot(props: StoryRootProps) {
	return (
		<div
			class={`mx-auto w-full ${props.width === "narrow" ? "max-w-sm" : "max-w-3xl"}`}
		>
			<ExplorePageLayout
				title="Explore Releases"
				action={{ to: "/release/new", label: "Create release" }}
			>
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={props.releases}
						with={<Divider horizontal />}
					>
						{(release) => <ReleaseItem release={release} />}
					</Intersperse>
				</div>
			</ExplorePageLayout>
		</div>
	)
}

function ReleaseGridStoryRoot(props: StoryRootProps) {
	return (
		<div class="w-64 bg-primary px-8 py-8">
			<Show when={props.releases[0]}>
				{(release) => <ReleaseGridItem release={release()} />}
			</Show>
		</div>
	)
}

const meta = {
	title: "View/Explore/Release",
	component: ReleaseListStoryRoot,
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
		releases: RELEASES,
		width: "full",
	},
	argTypes: {
		releases: { control: false },
		width: {
			control: "select",
			options: ["full", "narrow"],
		},
	},
} satisfies Meta<typeof ReleaseListStoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const List: Story = {
	render: ReleaseListStoryRoot,
}

export const Grid: Story = {
	render: ReleaseGridStoryRoot,
}

export const NarrowList: Story = {
	args: { width: "narrow" },
	render: ReleaseListStoryRoot,
}
