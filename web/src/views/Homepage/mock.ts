export const recommendedPlaylists = [
	{
		id: 1,
		title: "秘封俱乐部",
		coverUrl: "https://placehold.co/200x200/ef5d5d/white?text=秘封俱乐部",
		creator: "紫妈",
	},
	{
		id: 2,
		title: "幻想乡民谣",
		coverUrl: "https://placehold.co/200x200/ef5d5d/white?text=幻想乡民谣",
		creator: "灵梦",
	},
	{
		id: 3,
		title: "红魔馆之夜",
		coverUrl: "https://placehold.co/200x200/ef5d5d/white?text=红魔馆之夜",
		creator: "蕾米莉亚",
	},
	{
		id: 4,
		title: "妖怪山电音",
		coverUrl: "https://placehold.co/200x200/ef5d5d/white?text=妖怪山电音",
		creator: "天子",
	},
	{
		id: 5,
		title: "永夜的幻想",
		coverUrl: "https://placehold.co/200x200/ef5d5d/white?text=永夜的幻想",
		creator: "辉夜",
	},
]

export const banners = [
	{
		id: 1,
		imageUrl:
			"https://placehold.co/1200x300/ef5d5d/white?text=东方同音鉴新发布",
		title: "东方同音鉴新发布",
	},
	{
		id: 2,
		imageUrl: "https://placehold.co/1200x300/8a2be2/white?text=新专辑上线",
		title: "新专辑上线",
	},
	{
		id: 3,
		imageUrl: "https://placehold.co/1200x300/ff69b4/white?text=音乐会回顾",
		title: "音乐会回顾",
	},
]

export const newMusicTracks = Array.from({ length: 6 }).map((_, i) => ({
	id: i + 1,
	title: `东方同音鉴曲目 ${i + 1}`,
	artist: "幻想乡音乐人",
	coverUrl: `https://placehold.co/100x100/ef5d5d/white?text=${i + 1}`,
}))
