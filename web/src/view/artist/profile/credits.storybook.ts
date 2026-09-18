import { createMemo, createSignal } from "solid-js"

import type {
	ArtistCreditScope,
	ArtistCreditSort,
	ArtistCredits,
} from "~/hey-api"

import type { ArtistCreditsModel } from "./comp/ArtistCredits"

export const ARTIST_CREDITS_STORY_DATA: Pick<
	ArtistCredits,
	"release" | "song"
> = {
	release: [
		{
			release_id: 301,
			title: "Borderline Archive",
			release_type: "Album",
			release_date: { precision: "Day", value: "2024-08-12" },
			artist: [{ id: 55, name: "CYTOKINE" }],
			roles: [
				{ id: 2, name: "Composer" },
				{ id: 3, name: "Producer" },
			],
			cover_url: "/img/cover/release/1.png",
		},
		{
			release_id: 303,
			title: "Moonlit Ensemble",
			release_type: "Album",
			release_date: { precision: "Year", value: "2022-01-01" },
			artist: [{ id: 55, name: "CYTOKINE" }],
			roles: [],
			cover_url: null,
		},
		{
			release_id: 304,
			title: "Scarlet Nocturne",
			release_type: "Ep",
			release_date: { precision: "Month", value: "2023-12-01" },
			artist: [{ id: 18, name: "SOUND HOLIC" }],
			roles: [{ id: 3, name: "Producer" }],
			cover_url: null,
		},
		{
			release_id: 305,
			title:
				"東方弦奏オーケストラ — 幻想郷の四季と夜明けの記憶 / Complete Live Recording",
			release_type: "Compilation",
			release_date: { precision: "Day", value: "2025-05-05" },
			artist: [
				{ id: 9, name: "TAMUSIC" },
				{ id: 18, name: "SOUND HOLIC" },
				{ id: 55, name: "CYTOKINE" },
				{ id: 88, name: "ShibayanRecords" },
			],
			roles: [
				{ id: 2, name: "Composer" },
				{ id: 3, name: "Producer" },
				{ id: 5, name: "Orchestration and string arrangement" },
				{ id: 6, name: "Recording engineer" },
			],
			cover_url: "/img/cover/release/1.png",
		},
		{
			release_id: 306,
			title: "Untitled Session",
			release_type: "Demo",
			release_date: null,
			artist: [],
			roles: [{ id: 6, name: "Recording engineer" }],
			cover_url: null,
		},
		{
			release_id: 307,
			title: "夜明けのアーカイブ",
			release_type: "Single",
			release_date: { precision: "Year", value: "2020-01-01" },
			artist: [{ id: 9, name: "TAMUSIC" }],
			roles: [],
			cover_url: "/img/cover/release/1.png",
		},
	],
	song: [
		{
			song_id: 401,
			title: "Lunar Clock",
			primary_release_id: 301,
			roles: [
				{ id: 1, name: "Arranger" },
				{ id: 4, name: "Violin" },
			],
			releases: [
				{
					release_id: 301,
					title: "Borderline Archive",
					release_date: { precision: "Day", value: "2024-08-12" },
					disc: { index: 1 },
					track_number: "A10",
				},
				{
					release_id: 302,
					title: "Night Sessions",
					release_date: null,
					disc: null,
					track_number: "10",
				},
			],
		},
		{
			song_id: 404,
			title: "Border of Dreams",
			primary_release_id: 301,
			roles: [{ id: 1, name: "Arranger" }],
			releases: [
				{
					release_id: 301,
					title: "Borderline Archive",
					release_date: { precision: "Day", value: "2024-08-12" },
					disc: { index: 1 },
					track_number: "A2",
				},
			],
		},
		{
			song_id: 405,
			title: "Unnumbered Bonus Track",
			primary_release_id: 301,
			roles: [{ id: 4, name: "Violin" }],
			releases: [
				{
					release_id: 301,
					title: "Borderline Archive",
					release_date: { precision: "Day", value: "2024-08-12" },
					disc: { index: 1 },
					track_number: null,
				},
			],
		},
		{
			song_id: 402,
			title: "Evening Breeze",
			primary_release_id: 303,
			roles: [{ id: 1, name: "Arranger" }],
			releases: [
				{
					release_id: 303,
					title: "Moonlit Ensemble",
					release_date: { precision: "Year", value: "2022-01-01" },
					disc: null,
					track_number: "B1",
				},
			],
		},
		{
			song_id: 403,
			title: "Unreleased Demo",
			primary_release_id: null,
			roles: [{ id: 3, name: "Producer" }],
			releases: [],
		},
		...[
			"風の通り道",
			"Library after Midnight",
			"紅い月の記憶",
			"Rain on the Shrine Steps",
			"遠い春の足音",
			"Returning to the Border",
			"夜空を渡る舟",
			"Encore — The Last Train Home",
		].map((title, index) => ({
			song_id: 410 + index,
			title,
			primary_release_id: 301,
			roles: [
				{ id: 1, name: "Arranger" },
				{ id: 4, name: "Violin" },
			],
			releases: [
				{
					release_id: 301,
					title: "Borderline Archive",
					release_date: { precision: "Day" as const, value: "2024-08-12" },
					disc: { index: 2 },
					track_number: String(index + 1),
				},
			],
		})),
		...["春の序曲", "夏の夜想曲", "秋の間奏曲", "冬の終曲"].map(
			(title, index) => ({
				song_id: 420 + index,
				title,
				primary_release_id: 305,
				roles: [
					{ id: 1, name: "Arranger" },
					{ id: 4, name: "Violin" },
					{ id: 5, name: "Orchestration and string arrangement" },
				],
				releases: [
					{
						release_id: 305,
						title:
							"東方弦奏オーケストラ — 幻想郷の四季と夜明けの記憶 / Complete Live Recording",
						release_date: { precision: "Day" as const, value: "2025-05-05" },
						disc: null,
						track_number: String(index + 1),
					},
				],
			}),
		),
		...["夜明け", "薄明", "残響"].map((title, index) => ({
			song_id: 430 + index,
			title,
			primary_release_id: 307,
			roles: [],
			releases: [
				{
					release_id: 307,
					title: "夜明けのアーカイブ",
					release_date: { precision: "Year" as const, value: "2020-01-01" },
					disc: null,
					track_number: index === 2 ? null : String(index + 1),
				},
			],
		})),
		{
			song_id: 440,
			title: "未発表音源 — 夜明けを待つ街のための長いピアノ即興演奏",
			primary_release_id: null,
			roles: [
				{ id: 2, name: "Composer" },
				{ id: 5, name: "Orchestration and string arrangement" },
			],
			releases: [],
		},
		{
			song_id: 441,
			title: "Untitled rehearsal",
			primary_release_id: null,
			roles: [],
			releases: [],
		},
	],
}

export function createArtistCreditsStoryModel(
	data: () => Pick<ArtistCredits, "release" | "song">,
): ArtistCreditsModel {
	const [scope, setScope] = createSignal<ArtistCreditScope>("all")
	const [roleId, setRoleId] = createSignal<number>()
	const [sort, setSort] = createSignal<ArtistCreditSort>("newest")
	const filteredData = createMemo(() => {
		const currentSort = sort()
		const song =
			scope() === "release"
				? []
				: data().song.filter(
						(item) =>
							roleId() === undefined
							|| item.roles.some((role) => role.id === roleId()),
					)
		const release = data()
			.release.flatMap((item) => {
				const matchesRelease =
					scope() !== "song"
					&& item.roles.length > 0
					&& (roleId() === undefined
						|| item.roles.some((role) => role.id === roleId()))
				if (
					!matchesRelease
					&& !song.some(
						(credit) => credit.primary_release_id === item.release_id,
					)
				)
					return []
				return [{ ...item, roles: matchesRelease ? item.roles : [] }]
			})
			.toSorted((a, b) => {
				if (a.release_date == null)
					return b.release_date == null
						? a.title.localeCompare(b.title) || a.release_id - b.release_id
						: 1
				if (b.release_date == null) return -1
				const order = a.release_date.value.localeCompare(b.release_date.value)
				return (
					(currentSort === "newest" ? -order : order)
					|| a.title.localeCompare(b.title)
					|| a.release_id - b.release_id
				)
			})
		return { release, song }
	})
	return {
		get data() {
			return filteredData()
		},
		get scope() {
			return scope()
		},
		get roleId() {
			return roleId()
		},
		get sort() {
			return sort()
		},
		get roles() {
			return [
				...new Map(
					[...data().release, ...data().song]
						.flatMap((item) => item.roles)
						.map((role) => [role.id, role]),
				).values(),
			]
		},
		get hasCredits() {
			return data().release.length > 0 || data().song.length > 0
		},
		hasNext: false,
		isLoading: false,
		isFetchingNextPage: false,
		hasError: false,
		onScopeChange: setScope,
		onRoleChange: setRoleId,
		onSortChange: setSort,
		next: () => undefined,
		retry: () => undefined,
	}
}
