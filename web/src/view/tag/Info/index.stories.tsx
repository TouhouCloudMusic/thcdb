import * as stylex from "@stylexjs/stylex"
import type { Tag } from "@thc/api"
import { batch, createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type {
	EntityUserCollectionSort,
	ReleaseListItem,
	SongListItem,
	UserCollection,
} from "~/hey-api"
import { MOCK_CORRECTION_HISTORY } from "~/mock/correction"
import { createMockReleaseListItem } from "~/mock/release"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { TagInfoPage } from "."
import type { TagCollectionsStore, TagEntitySort } from "."
import type { TagResultsStore } from "./results"

const styles = stylex.create({
	story: {
		minHeight: "900px",
		backgroundColor: palette.slate[100],
		padding: px[24],
	},
})

const TAG: Tag = {
	id: 72,
	name: "Touhou arrangement",
	type: "Scene",
	short_description:
		"Fan-made arrangements derived from music in the Touhou Project series.",
	description: `    Touhou arrangement describes music that reinterprets themes from the Touhou Project games. Circles publish these works across electronic, rock, orchestral, vocal, and experimental styles.

    The tag applies to both close arrangements and heavily transformed works when the source melody remains identifiable. Use a more specific genre tag alongside it when the production style is known.`,
	alt_names: [
		{ id: 1, name: "Touhou arrange" },
		{ id: 2, name: "東方アレンジ" },
		{ id: 3, name: "Touhou doujin music" },
	],
	relations: [
		{
			tag: { id: 73, name: "Doujin music", type: "Scene" },
			type: "Inherit",
		},
		{
			tag: { id: 76, name: "Fan music", type: "Scene" },
			type: "Inherit",
		},
		{
			tag: { id: 77, name: "Video game music", type: "Scene" },
			type: "Inherit",
		},
		{
			tag: { id: 78, name: "Japanese independent music", type: "Scene" },
			type: "Inherit",
		},
		{
			tag: { id: 74, name: "Touhou vocal", type: "Descriptor" },
			type: "Derive",
		},
		{
			tag: { id: 75, name: "Touhou instrumental", type: "Descriptor" },
			type: "Derive",
		},
		{
			tag: { id: 79, name: "Touhou orchestral", type: "Descriptor" },
			type: "Derive",
		},
		{
			tag: { id: 80, name: "Touhou jazz", type: "Descriptor" },
			type: "Derive",
		},
		{
			tag: { id: 81, name: "Touhou rock", type: "Descriptor" },
			type: "Derive",
		},
	],
}

const RELEASES = [
	createMockReleaseListItem(1, {
		title: "蓬莱人形 ～ Dolls in Pseudo Paradise",
		artists: [{ id: 1, name: "ZUN" }],
	}),
	createMockReleaseListItem(2, {
		title: "Lovelight",
		artists: [{ id: 2, name: "Alstroemeria Records" }],
	}),
	createMockReleaseListItem(3, {
		title: "東方ストライク",
		artists: [{ id: 3, name: "COOL&CREATE" }],
	}),
	createMockReleaseListItem(4, { title: "Metamorphosis" }),
	createMockReleaseListItem(5, { title: "幻想ホモ・ルーデンス" }),
	createMockReleaseListItem(6, { title: "東方乙女囃子" }),
]

const SONG_TITLES = [
	"Bad Apple!!",
	"U.N. Owen Was Her?",
	"Shanghai Kouchakan",
	"幽雅に咲かせ、墨染の桜",
	"恋色マスタースパーク",
	"ネクロファンタジア",
] as const
const SONG_ARTISTS = [
	"Alstroemeria Records",
	"IOSYS",
	"ZUN",
	"凋叶棕",
	"COOL&CREATE",
	"SOUND HOLIC",
] as const
const SONGS: SongListItem[] = [1, 2, 3, 4, 5, 6].map((id) => ({
	id,
	title: SONG_TITLES[id - 1]!,
	cover_art_url: "/img/cover/release/1.png",
	artists: [
		{
			id,
			name: SONG_ARTISTS[id - 1]!,
		},
	],
	releases: [],
}))

const COLLECTIONS: UserCollection[] = [
	{
		id: 1,
		name: "Touhou music: a starting point",
		description:
			"Circles, releases, and tags for exploring Touhou arrangements.",
		owner: { id: 1, name: "Kaze Ito" },
		is_public: true,
		item_count: 32,
		follower_count: 18,
	},
	{
		id: 2,
		name: "Doujin scenes & sounds",
		description: "A collection of doujin music scenes and their artists.",
		owner: { id: 2, name: "Rin Hoshino" },
		is_public: true,
		item_count: 56,
		follower_count: 24,
	},
	{
		id: 3,
		name: "東方アレンジの世界",
		description: "Vocal, instrumental, and electronic arrangements.",
		owner: { id: 3, name: "Mika Arisato" },
		is_public: true,
		item_count: 48,
		follower_count: 12,
	},
	{
		id: 4,
		name: "Electronic arrangements",
		description:
			"House, trance, and experimental interpretations of Touhou themes.",
		owner: { id: 4, name: "Aoi" },
		is_public: true,
		item_count: 27,
		follower_count: 42,
	},
	{
		id: 5,
		name: "Piano and chamber music",
		description: "Acoustic arrangements for quieter listening.",
		owner: { id: 5, name: "Haru" },
		is_public: true,
		item_count: 19,
		follower_count: 9,
	},
	{
		id: 6,
		name: "Live circles",
		description: "Rock bands and vocal circles from the Touhou scene.",
		owner: { id: 6, name: "Yuki" },
		is_public: true,
		item_count: 38,
		follower_count: 31,
	},
]

function StoryRoot(props: { tag: Tag }) {
	const [releasePage, setReleasePage] = createSignal(1)
	const [releaseSort, setReleaseSort] = createSignal<TagEntitySort>("popular")
	const releases: TagResultsStore<ReleaseListItem> & {
		sortBy: TagEntitySort
		setSortBy: (sort: TagEntitySort) => void
	} = {
		get data() {
			return {
				items: RELEASES.slice((releasePage() - 1) * 5, releasePage() * 5),
				page: releasePage(),
				total_pages: 2,
			}
		},
		status: "success",
		setPage: setReleasePage,
		get sortBy() {
			return releaseSort()
		},
		setSortBy: (sort) =>
			batch(() => {
				setReleaseSort(sort)
				setReleasePage(1)
			}),
	}
	const [songPage, setSongPage] = createSignal(1)
	const [songSort, setSongSort] = createSignal<TagEntitySort>("popular")
	const songs: TagResultsStore<SongListItem> & {
		sortBy: TagEntitySort
		setSortBy: (sort: TagEntitySort) => void
	} = {
		get data() {
			return {
				items: SONGS.slice((songPage() - 1) * 5, songPage() * 5),
				page: songPage(),
				total_pages: 2,
			}
		},
		status: "success",
		setPage: setSongPage,
		get sortBy() {
			return songSort()
		},
		setSortBy: (sort) =>
			batch(() => {
				setSongSort(sort)
				setSongPage(1)
			}),
	}
	const [collectionPage, setCollectionPage] = createSignal(1)
	const [collectionSort, setCollectionSort] =
		createSignal<EntityUserCollectionSort>("collected_at")
	const collections: TagCollectionsStore = {
		get data() {
			const items =
				collectionSort() === "follower_count"
					? COLLECTIONS.toSorted(
							(left, right) => right.follower_count - left.follower_count,
						)
					: COLLECTIONS
			return {
				items: items.slice((collectionPage() - 1) * 5, collectionPage() * 5),
				page: collectionPage(),
				total_pages: 2,
			}
		},
		status: "success",
		get sortBy() {
			return collectionSort()
		},
		setPage: setCollectionPage,
		setSortBy: (sort) =>
			batch(() => {
				setCollectionSort(sort)
				setCollectionPage(1)
			}),
	}

	return (
		<div {...stylex.attrs(styles.story)}>
			<TagInfoPage
				tag={props.tag}
				correctionHistory={MOCK_CORRECTION_HISTORY}
				releases={releases}
				songs={songs}
				collections={collections}
			/>
		</div>
	)
}

const meta = {
	title: "View/Tag",
	component: StoryRoot,
	args: { tag: TAG },
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
