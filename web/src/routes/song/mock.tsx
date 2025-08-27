import { createFileRoute } from "@tanstack/solid-router"
import type { Song } from "@thc/api"

import { SongInfoPage } from "~/views/song/Info"

export const Route = createFileRoute("/song/mock")({
	component: RouteComponent,
})
const mockData: Song = {
	id: 1,
	title: "幻想郷の夜明け",
	artists: [
		{
			id: 1,
			name: "ZUN",
		},
		{
			id: 2,
			name: "Alstroemeria Records",
		},
		{
			id: 3,
			name: "IOSYS",
		},
		{
			id: 4,
			name: "Demetori",
		},
		{
			id: 5,
			name: "Halozy",
		},
	],
	releases: [
		{
			id: 1,
			title: "東方紅魔郷 ～ the Embodiment of Scarlet Devil",
			cover_art_url: "https://picsum.photos/400/400?random=1",
		},
		{
			id: 2,
			title: "東方妖々夢 ～ Perfect Cherry Blossom",
			cover_art_url: "https://picsum.photos/400/400?random=2",
		},
		{
			id: 3,
			title: "東方永夜抄 ～ Imperishable Night",
			cover_art_url: "https://picsum.photos/400/400?random=3",
		},
		{
			id: 4,
			title: "東方花映塚 ～ Phantasmagoria of Flower View",
			cover_art_url: "https://picsum.photos/400/400?random=4",
		},
		{
			id: 5,
			title: "東方風神録 ～ Mountain of Faith",
			cover_art_url: "https://picsum.photos/400/400?random=5",
		},
		{
			id: 6,
			title: "東方地霊殿 ～ Subterranean Animism",
			cover_art_url: "https://picsum.photos/400/400?random=6",
		},
		{
			id: 7,
			title: "東方星蓮船 ～ Undefined Fantastic Object",
			cover_art_url: "https://picsum.photos/400/400?random=7",
		},
		{
			id: 8,
			title: "東方神霊廟 ～ Ten Desires",
			cover_art_url: "https://picsum.photos/400/400?random=8",
		},
		{
			id: 9,
			title: "東方輝針城 ～ Double Dealing Character",
			cover_art_url: "https://picsum.photos/400/400?random=9",
		},
		{
			id: 10,
			title: "東方紺珠伝 ～ Legacy of Lunatic Kingdom",
			cover_art_url: "https://picsum.photos/400/400?random=10",
		},
		{
			id: 11,
			title: "東方天空璋 ～ Hidden Star in Four Seasons",
			cover_art_url: "https://picsum.photos/400/400?random=11",
		},
		{
			id: 12,
			title: "東方鬼形獣 ～ Wily Beast and Weakest Creature",
			cover_art_url: "https://picsum.photos/400/400?random=12",
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
		},
		{
			artist: {
				id: 2,
				name: "Alstroemeria Records",
			},
			role: {
				id: 2,
				name: "Arranger",
			},
		},
		{
			artist: {
				id: 2,
				name: "Alstroemeria Records",
			},
			role: {
				id: 3,
				name: "Composer",
			},
		},
		{
			artist: {
				id: 2,
				name: "Alstroemeria Records",
			},
			role: {
				id: 4,
				name: "Remixer",
			},
		},
		{
			artist: {
				id: 3,
				name: "IOSYS",
			},
			role: {
				id: 3,
				name: "Vocal Arranger",
			},
		},
		{
			artist: {
				id: 4,
				name: "Demetori",
			},
			role: {
				id: 4,
				name: "Metal Arranger",
			},
		},
		{
			artist: {
				id: 5,
				name: "Halozy",
			},
			role: {
				id: 5,
				name: "Electronic Arranger",
			},
		},
		{
			artist: {
				id: 6,
				name: "ARM",
			},
			role: {
				id: 6,
				name: "Producer",
			},
		},
		{
			artist: {
				id: 7,
				name: "nana",
			},
			role: {
				id: 7,
				name: "Vocalist",
			},
		},
		{
			artist: {
				id: 8,
				name: "Masayoshi Minoshima",
			},
			role: {
				id: 8,
				name: "Sound Engineer",
			},
		},
		{
			artist: {
				id: 9,
				name: "beatMARIO",
			},
			role: {
				id: 9,
				name: "Remix Artist",
			},
		},
		{
			artist: {
				id: 10,
				name: "Comp",
			},
			role: {
				id: 10,
				name: "Guitarist",
			},
		},
	],
	languages: [
		{
			id: 1,
			code: "ja",
			name: "Japanese",
		},
		{
			id: 2,
			code: "en",
			name: "English",
		},
		{
			id: 3,
			code: "zh-Hans",
			name: "Simplified Chinese",
		},
	],
	localized_titles: [
		{
			language: {
				id: 1,
				code: "ja",
				name: "Japanese",
			},
			title: "幻想郷の夜明け",
		},
		{
			language: {
				id: 2,
				code: "en",
				name: "English",
			},
			title: "Dawn of Gensokyo",
		},
		{
			language: {
				id: 3,
				code: "zh-Hans",
				name: "Simplified Chinese",
			},
			title: "幻想乡的黎明",
		},
		{
			language: {
				id: 4,
				code: "ko",
				name: "Korean",
			},
			title: "환상향의 새벽",
		},
	],
	lyrics: [
		{
			id: 1,
			song_id: 1,

			content: `東の国の眠らない夜に
幻想の扉が開かれて
古き良き調べが響いている
永遠の調和を奏でながら

夜明けの光が差し込んで
新しい世界が始まるよ
幻想郷の夜明けとともに
希望の歌声が聞こえてくる

風に舞う桜の花びらが
時の流れを教えてくれる
変わらない想いを胸に秘めて
今日という日を大切にしよう`,
			is_main: true,
			language: {
				id: 1,
				code: "ja",
				name: "Japanese",
			},
		},
		{
			id: 2,
			song_id: 1,
			content: `In the sleepless night of the eastern land
The door to fantasy opens wide
Ancient melodies echo through the air
Playing eternal harmony

The light of dawn breaks through
A new world begins to unfold
With the dawn of Gensokyo
We hear the song of hope

Cherry blossoms dance in the wind
Teaching us the flow of time
With unchanging feelings in our hearts
Let's treasure this precious day`,
			is_main: false,
			language: {
				id: 2,
				code: "en",
				name: "English",
			},
		},
		{
			id: 3,
			song_id: 1,

			content: `在东方国度的不眠之夜
幻想之门缓缓开启
古老的旋律在空中回响
奏响着永恒的和谐

黎明的光芒照射进来
新的世界开始展开
伴随着幻想乡的黎明
我们听到希望的歌声

樱花花瓣在风中飞舞
教导着我们时间的流逝
怀着不变的情感在心中
让我们珍惜这宝贵的一天`,
			is_main: false,
			language: {
				id: 3,
				code: "zh-Hans",
				name: "Simplified Chinese",
			},
		},
	],
}
function RouteComponent() {
	return (
		<>
			<SongInfoPage song={mockData} />
		</>
	)
}
