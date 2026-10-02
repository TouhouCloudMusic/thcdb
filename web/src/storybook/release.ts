import type { Release } from "@thc/api"

export const CRADLE_RELEASE_DESCRIPTION =
	"《Cradle - 東方幻樂祀典》（2004，SEPR-0001）。曲目、编曲及美术署名来自 [sound sepher 官网](https://sepher.jp/circle/circle_09.htm)，时长和演唱、作词署名来自 [Gensokyo Radio](https://gensokyoradio.net/music/album/11094/)。未确认的演出者留空；ID 仅用于本地展示，不对应线上实体。"

const CRADLE_DISCS = [
	{
		id: 1,
		name: "Acoustic Side",
		tracks: [
			{
				title: "ほおずきみたいに紅い魂",
				duration: 153000,
				arrangers: ["setzer"],
			},
			{ title: "ルーネイトエルフ", duration: 200000, arrangers: ["柳 英一郎"] },
			{ title: "遠野幻想物語", duration: 329000, arrangers: ["Eru"] },
			{ title: "妖魔夜行", duration: 249000, arrangers: ["Nauts"] },
			{
				title: "懐かしき東方の血 ～ Old World",
				duration: 368000,
				arrangers: ["nagi"],
			},
			{
				title: "人形裁判 ～ 人の形弄びし少女",
				duration: 241000,
				arrangers: ["Godspeed"],
			},
			{
				title: "幻視の夜 ～ Ghostly Eyes 'I'",
				duration: 298000,
				arrangers: ["埼玉最終兵器"],
			},
			{
				title: "幽雅に咲かせ、墨染の桜 ～ Border of Life",
				duration: 253000,
				arrangers: ["WORRY"],
			},
			{
				title: "懐かしき東方の血 ～ Old World",
				duration: 366000,
				arrangers: ["紅薙 たびびと"],
			},
			{
				title: "さくらさくら ～ Japanize Dream...",
				duration: 253000,
				arrangers: ["あず"],
			},
			{
				title: "夜雀の歌声 ～ Night Bird",
				duration: 230000,
				arrangers: ["真中 あきひと"],
			},
			{ title: "プレインエイジア", duration: 181000, arrangers: ["supply"] },
			{
				title: "幽霊楽団 ～ Phantom Ensemble",
				duration: 243000,
				arrangers: ["ESTi"],
			},
			{
				title: "紅楼 ～ Eastern Dream...",
				duration: 284000,
				arrangers: ["青猫"],
			},
			{
				title: "上海紅茶館 ～ Chinese Tea",
				duration: 291000,
				arrangers: ["汐凪くじら"],
			},
			{
				title: "シンデレラケージ ～ Kagome-Kagome",
				duration: 342000,
				arrangers: ["ZUN"],
			},
			{ title: "妖々跋扈 ～ Speed Fox!", duration: 282000, arrangers: ["ZUN"] },
		],
	},
	{
		id: 2,
		name: "Club Remixes Side",
		tracks: [
			{
				title: "ボーダーオブライフ",
				duration: 426000,
				arrangers: ["紅薙 たびびと"],
			},
			{
				title: "ブクレシュティの人形師",
				duration: 199000,
				arrangers: ["WORRY"],
			},
			{
				title: "妖々夢 ～ Snow or Cherry Petal",
				duration: 285000,
				arrangers: ["Hizuru"],
			},
			{ title: "おてんば恋娘", duration: 371000, arrangers: ["Lix"] },
			{
				title: "ラクトガール ～ 少女密室",
				duration: 284000,
				arrangers: ["Jun.A"],
			},
			{
				title: "少女幻葬 ～ Necro Fantasy",
				duration: 275000,
				arrangers: ["橋本 鏡也"],
			},
			{
				title: "ネクロファンタジア",
				duration: 297000,
				arrangers: ["矢鴇 つかさ"],
			},
			{
				title: "幻視の夜 ～ Ghostly Eyes 'II'",
				duration: 283000,
				arrangers: ["埼玉最終兵器"],
			},
			{ title: "天空の花の都", duration: 429000, arrangers: ["zts"] },
			{
				title: "U.N.オーエンは彼女なのか？",
				duration: 242000,
				arrangers: ["ゆう"],
			},
			{
				title: "無何有の郷 ～ Deep Mountain",
				duration: 392000,
				arrangers: ["JOYH-TV"],
			},
			{
				title: "妖々夢 (Rearrange)",
				duration: 627000,
				arrangers: ["Hizuru", "Lix"],
			},
		],
	},
]

const CRADLE_TRACKS = CRADLE_DISCS.flatMap((disc) =>
	disc.tracks.map((track, index) => ({
		...track,
		disc_id: disc.id,
		track_number: (index + 1).toString().padStart(2, "0"),
	})),
)

const CRADLE_ARTISTS = new Map(
	[
		...new Set([
			...CRADLE_TRACKS.flatMap((track) => track.arrangers),
			"x6suke",
			"SHN'",
		]),
	].map((name, index) => [name, { id: index + 1, name }]),
)

export const CRADLE_RELEASE = {
	id: 297,
	title: "Cradle - 東方幻樂祀典",
	release_type: "Album",
	artists: [{ id: 100, name: "sound sepher" }],
	release_date: { precision: "Day", value: "2004-08-15" },
	catalog_nums: [
		{
			catalog_number: "SEPR-0001",
			label: { id: 100, name: "sound sepher" },
		},
	],
	events: [{ id: 1, name: "Comic Market 66" }],
	links: [
		"https://sepher.jp/circle/circle_09.htm",
		"https://gensokyoradio.net/music/album/11094/",
	],
	discs: CRADLE_DISCS.map((disc) => ({ id: disc.id, name: disc.name })),
	tracks: CRADLE_TRACKS.map((track, index) => ({
		id: index + 1,
		disc_id: track.disc_id,
		track_number: track.track_number,
		duration: track.duration,
		song: { id: 901 + index, title: track.title },
		artists: index === 22 ? [CRADLE_ARTISTS.get("橋本 鏡也")!] : [],
	})),
	credits: [
		...CRADLE_TRACKS.flatMap((track, index) =>
			track.arrangers.map((name) => ({
				artist: CRADLE_ARTISTS.get(name)!,
				role: { id: 1, name: "Arrangement" },
				on: [index],
			})),
		),
		{
			artist: CRADLE_ARTISTS.get("橋本 鏡也")!,
			role: { id: 2, name: "Vocals" },
			on: [22],
		},
		{
			artist: CRADLE_ARTISTS.get("橋本 鏡也")!,
			role: { id: 3, name: "Lyrics" },
			on: [22],
		},
		{
			artist: CRADLE_ARTISTS.get("ZUN")!,
			role: { id: 4, name: "Composition" },
			on: null,
		},
		{
			artist: CRADLE_ARTISTS.get("x6suke")!,
			role: { id: 5, name: "Illustration" },
			on: null,
		},
		{
			artist: CRADLE_ARTISTS.get("SHN'")!,
			role: { id: 6, name: "Design" },
			on: null,
		},
	],
} satisfies Release
