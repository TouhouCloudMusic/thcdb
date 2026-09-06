import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/solid-router"
import { createMemo, onCleanup, Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { SearchResponse, UserCollection } from "~/hey-api"
import {
	searchArtistInfiniteQueryKey,
	searchReleaseInfiniteQueryKey,
	searchSongInfiniteQueryKey,
	searchEventInfiniteQueryKey,
	searchLabelInfiniteQueryKey,
	searchTagInfiniteQueryKey,
	searchUserCollectionsInfiniteQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { Route } from "~/route/search"
import {
	ARTIST_IMAGE_CREDITS,
	IOSYS_ARTIST,
	TOKYO_ACTIVE_NEETS_ARTIST,
	ZUN_ARTIST,
} from "~/storybook/fixtures"
import { StoryLayout } from "~/utils/adapter/storybook"

import { SearchPage } from "./index"

const ARTISTS = [
	{
		item: IOSYS_ARTIST,
		matched_name: null,
	},
	{
		item: TOKYO_ACTIVE_NEETS_ARTIST,
		matched_name: "東方ジャズ",
	},
	{
		item: ZUN_ARTIST,
		matched_name: null,
	},
] satisfies SearchResponse["artists"]["items"]
const RELEASES = [
	{
		item: {
			id: 1,
			title: "蓬莱人形 ～ Dolls in Pseudo Paradise",
			cover_art_url: "/img/cover/release/1.png",
			artists: [{ id: 1, name: "上海アリス幻樂団" }],
			release_type: "Album",
			release_date: { precision: "Day", value: "2002-08-11" },
			catalog_numbers: ["ZCDS-0001"],
		},
		matched_name: "東方音楽CD 蓬莱人形",
	},
	{
		item: {
			id: 2,
			title:
				"東方紅魔郷 ～ the Embodiment of Scarlet Devil — Original Soundtrack & Arrangements",
			artists: [
				{ id: 2, name: "COOL&CREATE" },
				{ id: 3, name: "SOUND HOLIC" },
			],
			release_type: "Compilation",
			release_date: { precision: "Year", value: "2024-01-01" },
			catalog_numbers: ["CCCD-0062", "SDHC-0100"],
		},
		matched_name: null,
	},
	{
		item: {
			id: 3,
			title: "東方アレンジ集",
			artists: [{ id: 3, name: "SOUND HOLIC" }],
			release_type: "Album",
			catalog_numbers: [],
		},
		matched_name: null,
	},
] satisfies SearchResponse["releases"]["items"]
const SONGS = [
	{
		item: {
			id: 1,
			title: "月まで届け、不死の煙",
			cover_art_url: "/img/cover/release/1.png",
			artists: [{ id: 1, name: "ZUN" }],
			releases: [
				{ id: 1, title: "東方永夜抄" },
				{ id: 2, title: "卯酉東海道 ～ Retrospective 53 minutes" },
			],
		},
		matched_name: "東方永夜抄 — Reach for the Moon, Immortal Smoke",
	},
	{
		item: {
			id: 2,
			title: "東方の夜明け",
			artists: [{ id: 2, name: "COOL&CREATE" }],
			releases: [],
		},
		matched_name: null,
	},
] satisfies SearchResponse["songs"]["items"]
const EVENTS = [
	{
		item: {
			id: 1,
			name: "第二十一回 博麗神社例大祭",
			start_date: { precision: "Day", value: "2024-05-03" },
			end_date: { precision: "Day", value: "2024-05-03" },
			location: {
				country: "Japan",
				province: "Tokyo",
				city: "Tokyo Big Sight",
			},
			short_description: "東方Projectの同人誌・音楽作品の頒布イベント。",
		},
		matched_name: "東方例大祭",
	},
	{
		item: { id: 2, name: "東方音楽祭", location: {}, short_description: "" },
		matched_name: null,
	},
] satisfies SearchResponse["events"]["items"]
const LABELS = [
	{
		item: {
			id: 1,
			name: "上海アリス幻樂団",
			localized_names: [
				{
					language: { id: 1, code: "en", name: "English" },
					name: "Team Shanghai Alice",
				},
			],
			founders: [{ id: 1, name: "ZUN" }],
			founded_date: { precision: "Year", value: "2002-01-01" },
		},
		matched_name: "東方Project",
	},
	{
		item: {
			id: 2,
			name: "東方音楽レーベル",
			localized_names: [],
			founders: [],
		},
		matched_name: null,
	},
] satisfies SearchResponse["labels"]["items"]
const TAGS = [
	{
		item: {
			id: 1,
			name: "Touhou arrangement",
			type: "Descriptor",
			short_description: "Arrangements of music from the Touhou Project games.",
			parents: [{ id: 2, name: "Arrangement", type: "Descriptor" }],
		},
		matched_name: "東方アレンジ",
	},
	{
		item: {
			id: 6,
			name: "Touhou instrumental arrangement",
			type: "Descriptor",
			short_description: "Instrumental arrangements of Touhou Project music.",
			parents: [
				{ id: 1, name: "Touhou arrangement", type: "Descriptor" },
				{ id: 5, name: "Instrumental arrangement", type: "Descriptor" },
			],
		},
		matched_name: null,
	},
	{
		item: {
			id: 3,
			name: "東方ボーカル",
			type: "Descriptor",
			short_description: "",
			parents: [],
		},
		matched_name: null,
	},
] satisfies SearchResponse["tags"]["items"]
const COLLECTIONS = [
	{
		id: 1,
		name: "東方アレンジ — Favourite vocal arrangements",
		description: "紅魔郷から虹龍洞まで、お気に入りのボーカルアレンジ。",
		owner: { id: 1, name: "Marisa" },
		is_public: true,
		item_count: 24,
		follower_count: 2,
	},
	{
		id: 2,
		name: "東方・秘封倶楽部",
		description: "",
		owner: { id: 2, name: "Renko" },
		is_public: true,
		item_count: 1,
		follower_count: 0,
	},
] satisfies UserCollection[]

const ENTITIES = [
	"all",
	"artist",
	"release",
	"song",
	"event",
	"label",
	"tag",
	"user_collection",
] as const
const STATES = ["results", "empty", "loading", "no-query"] as const

type StoryProps = {
	entity: (typeof ENTITIES)[number]
	state: (typeof STATES)[number]
}

function renderSearchScenario(scenario: StoryProps) {
	const client = new QueryClient({
		defaultOptions: { queries: { staleTime: Infinity, retry: false } },
	})
	const term = "東方"
	const options = { query: { search_term: term, limit: 20 } }
	const data = [
		[searchArtistInfiniteQueryKey(options), ARTISTS, 0],
		[searchReleaseInfiniteQueryKey(options), RELEASES, 0],
		[searchSongInfiniteQueryKey(options), SONGS, 0],
		[searchEventInfiniteQueryKey(options), EVENTS, 0],
		[searchLabelInfiniteQueryKey(options), LABELS, 0],
		[searchTagInfiniteQueryKey(options), TAGS, 0],
		[
			searchUserCollectionsInfiniteQueryKey({
				query: { keyword: term, limit: 20 },
			}),
			COLLECTIONS,
			1,
		],
	] as const
	for (const [queryKey, items, pageParam] of data) {
		if (scenario.state === "loading") {
			void client
				.fetchQuery({
					queryKey,
					queryFn: ({ signal }) =>
						new Promise<never>((_resolve, reject) => {
							signal.addEventListener(
								"abort",
								() => reject(new Error("Story query cancelled")),
								{
									once: true,
								},
							)
						}),
				})
				.catch(() => undefined)
		} else {
			client.setQueryData(queryKey, {
				pages: [
					{
						status: "success",
						data: {
							items: scenario.state === "empty" ? [] : items,
							next_cursor: null,
							page: 1,
							total_pages: 1,
							page_size: 20,
							total_items: scenario.state === "empty" ? 0 : items.length,
						},
					},
				],
				pageParams: [pageParam],
			})
		}
	}
	const root = createRootRoute()
	const searchRoute = createRoute({
		getParentRoute: () => root,
		path: "/search",
		validateSearch: Route.options.validateSearch,
		component: SearchPage,
	})
	const params = new URLSearchParams({
		q: scenario.state === "no-query" ? "" : term,
		entity: scenario.entity,
	})
	const router = createRouter({
		routeTree: root.addChildren([searchRoute]),
		history: createMemoryHistory({ initialEntries: [`/search?${params}`] }),
	})
	onCleanup(() => client.clear())
	return (
		<QueryClientProvider client={client}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	)
}

function StoryRoot(props: StoryProps) {
	const scenario = createMemo(() => ({
		entity: props.entity,
		state: props.state,
	}))
	return (
		<Show
			when={scenario()}
			keyed
		>
			{renderSearchScenario}
		</Show>
	)
}

const meta = {
	title: "View/Search/Page",
	component: StoryRoot,
	parameters: {
		layout: StoryLayout.FullScreen,
		docs: { description: { component: ARTIST_IMAGE_CREDITS } },
	},
	args: { entity: "all", state: "results" },
	argTypes: {
		entity: { control: "select", options: ENTITIES },
		state: { control: "select", options: STATES },
	},
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>
export const Results: Story = {}
export const Artists: Story = { args: { entity: "artist" } }
export const Releases: Story = { args: { entity: "release" } }
export const Empty: Story = { args: { state: "empty" } }
export const Loading: Story = { args: { state: "loading" } }
