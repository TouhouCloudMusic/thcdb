import { createFileRoute } from "@tanstack/solid-router"
import type { Release } from "@thc/api"

import { ReleaseInfoPage } from "~/view/release/Info"

export const Route = createFileRoute("/release/mock")({
	component: RouteComponent,
})

const mockData: Release = {
	id: 1,
	title: "東方紅魔郷 ～ the Embodiment of Scarlet Devil",
	release_type: "Album",
	cover_art_url: "https://picsum.photos/400/400?random=1",
	release_date: {
		value: "2002-08-11",
		precision: "Day",
	},
	recording_date_start: {
		value: "2002-06-01",
		precision: "Month",
	},
	recording_date_end: {
		value: "2002-07-31",
		precision: "Month",
	},
	artists: [
		{
			id: 1,
			name: "ZUN",
		},
		{
			id: 2,
			name: "Team Shanghai Alice",
		},
	],
	localized_titles: [
		{
			language: {
				id: 1,
				code: "ja",
				name: "Japanese",
			},
			title: "東方紅魔郷 ～ the Embodiment of Scarlet Devil",
		},
		{
			language: {
				id: 2,
				code: "en",
				name: "English",
			},
			title: "Touhou Koumakyou ~ the Embodiment of Scarlet Devil",
		},
		{
			language: {
				id: 3,
				code: "zh-Hans",
				name: "Simplified Chinese",
			},
			title: "东方红魔乡 ～ the Embodiment of Scarlet Devil",
		},
	],
	catalog_nums: [
		{
			catalog_number: "TH06",
			label_id: 1,
		},
		{
			catalog_number: "TEAM-SHA-001",
			label_id: undefined,
		},
	],
	discs: [
		{
			id: 1,
			name: "Disc A",
		},
	],
	tracks: [
		{
			id: 1,
			track_number: "1",
			song: { id: 1, title: "赤より紅い夢" },
			artists: [],
			duration: 62000,
			disc_id: 1,
		},
		{
			id: 2,
			track_number: "2",
			song: { id: 2, title: "ほおずきみたいに紅い魂" },
			artists: [],
			duration: 234000,
			disc_id: 1,
		},
		{
			id: 3,
			track_number: "3",
			song: { id: 3, title: "妖魔夜行" },
			artists: [],
			duration: 184000,
			disc_id: 1,
		},
		{
			id: 4,
			track_number: "4",
			song: { id: 4, title: "ルーネイトエルフ" },
			artists: [],
			duration: 178000,
			disc_id: 1,
		},
		{
			id: 5,
			track_number: "5",
			song: { id: 5, title: "おてんば恋娘" },
			artists: [],
			duration: 174000,
			disc_id: 1,
		},
		{
			id: 6,
			track_number: "6",
			song: { id: 6, title: "上海紅茶館 ～ Chinese Tea" },
			artists: [],
			duration: 221000,
			disc_id: 1,
		},
		{
			id: 7,
			track_number: "7",
			song: { id: 7, title: "明治十七年の上海アリス" },
			artists: [],
			duration: 201000,
			disc_id: 1,
		},
		{
			id: 8,
			track_number: "8",
			song: { id: 8, title: "ヴワル魔法図書館" },
			artists: [],
			duration: 181000,
			disc_id: 1,
		},
		{
			id: 9,
			track_number: "9",
			song: { id: 9, title: "ラクトガール ～ 少女密室" },
			artists: [],
			duration: 203000,
			disc_id: 1,
		},
		{
			id: 10,
			track_number: "10",
			song: { id: 10, title: "月時計 ～ ルナ・ダイアル" },
			artists: [],
			duration: 196000,
			disc_id: 1,
		},
		{
			id: 11,
			track_number: "11",
			song: { id: 11, title: "メイドと血の懐中時計" },
			artists: [],
			duration: 204000,
			disc_id: 1,
		},
		{
			id: 12,
			track_number: "12",
			song: { id: 12, title: "亡き王女の為のセプテット" },
			artists: [],
			duration: 234000,
			disc_id: 1,
		},
		{
			id: 13,
			track_number: "13",
			song: { id: 13, title: "魔法少女達の百年祭" },
			artists: [],
			duration: 224000,
			disc_id: 1,
		},
		{
			id: 14,
			track_number: "14",
			song: { id: 14, title: "U.N.オーエンは彼女なのか？" },
			artists: [],
			duration: 228000,
			disc_id: 1,
		},
		{
			id: 15,
			track_number: "15",
			song: { id: 15, title: "紅より儚い永遠" },
			artists: [],
			duration: 207000,
			disc_id: 1,
		},
		{
			id: 16,
			track_number: "16",
			song: { id: 16, title: "紅楼 ～ Eastern Dream..." },
			artists: [],
			duration: 250000,
			disc_id: 1,
		},
	],
	credits: [
		{
			artist: {
				id: 1,
				name: "ZUN",
			},
			role: {
				id: 1,
				name: "Original Composer",
			},
			on: undefined,
		},
		{
			artist: {
				id: 1,
				name: "ZUN",
			},
			role: {
				id: 2,
				name: "Game Designer",
			},
			on: undefined,
		},
		{
			artist: {
				id: 1,
				name: "ZUN",
			},
			role: {
				id: 3,
				name: "Programmer",
			},
			on: undefined,
		},
		{
			artist: {
				id: 1,
				name: "ZUN",
			},
			role: {
				id: 4,
				name: "Arranger",
			},
			on: [1, 2, 3, 4, 5],
		},
		{
			artist: {
				id: 2,
				name: "Team Shanghai Alice",
			},
			role: {
				id: 5,
				name: "Publisher",
			},
			on: undefined,
		},
		{
			artist: {
				id: 3,
				name: "2",
			},
			role: {
				id: 6,
				name: "Audio Engineer",
			},
			on: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		},
	],
}

function RouteComponent() {
	return (
		<>
			<ReleaseInfoPage release={mockData} />
		</>
	)
}
