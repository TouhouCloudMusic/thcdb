import { Title } from "@solidjs/meta"
import { createFileRoute } from "@tanstack/solid-router"
import { createSignal, For } from "solid-js"
import { CardStackIcon, ClockIcon, HeartIcon } from "solid-radix-icons"

import { ListItem, Sidebar } from "~/components/Sidebar"
import { Player } from "~/components/player"

export const Route = createFileRoute("/library")({
	component: LibraryPage,
})

function LibraryPage() {
	const [activeTab, setActiveTab] = createSignal("albums")

	const albums = [
		{
			id: 1,
			title: "幻想净琉璃",
			artist: "上海爱丽丝幻乐团",
			year: "2002",
			cover: "https://placehold.co/180x180/red/white?text=幻想净琉璃",
		},
		{
			id: 2,
			title: "东方风神录",
			artist: "上海爱丽丝幻乐团",
			year: "2007",
			cover: "https://placehold.co/180x180/purple/white?text=东方风神录",
		},
		{
			id: 3,
			title: "东方地灵殿",
			artist: "上海爱丽丝幻乐团",
			year: "2008",
			cover: "https://placehold.co/180x180/green/white?text=东方地灵殿",
		},
		{
			id: 4,
			title: "东方星莲船",
			artist: "上海爱丽丝幻乐团",
			year: "2009",
			cover: "https://placehold.co/180x180/blue/white?text=东方星莲船",
		},
		{
			id: 5,
			title: "东方神灵庙",
			artist: "上海爱丽丝幻乐团",
			year: "2011",
			cover: "https://placehold.co/180x180/orange/white?text=东方神灵庙",
		},
		{
			id: 6,
			title: "东方辉针城",
			artist: "上海爱丽丝幻乐团",
			year: "2013",
			cover: "https://placehold.co/180x180/pink/white?text=东方辉针城",
		},
		{
			id: 7,
			title: "东方绀珠传",
			artist: "上海爱丽丝幻乐团",
			year: "2015",
			cover: "https://placehold.co/180x180/cyan/white?text=东方绀珠传",
		},
		{
			id: 8,
			title: "东方天空璋",
			artist: "上海爱丽丝幻乐团",
			year: "2017",
			cover: "https://placehold.co/180x180/yellow/white?text=东方天空璋",
		},
	]

	const artists = [
		{
			id: 1,
			name: "ZUN",
			albums: 18,
			cover: "https://placehold.co/120x120/gray/white?text=ZUN",
		},
		{
			id: 2,
			name: "暁Records",
			albums: 12,
			cover: "https://placehold.co/120x120/gray/white?text=暁Records",
		},
		{
			id: 3,
			name: "Alstroemeria Records",
			albums: 20,
			cover: "https://placehold.co/120x120/gray/white?text=AR",
		},
		{
			id: 4,
			name: "FELT",
			albums: 15,
			cover: "https://placehold.co/120x120/gray/white?text=FELT",
		},
		{
			id: 5,
			name: "SOUND HOLIC",
			albums: 22,
			cover: "https://placehold.co/120x120/gray/white?text=SH",
		},
		{
			id: 6,
			name: "Riverside",
			albums: 8,
			cover: "https://placehold.co/120x120/gray/white?text=Riverside",
		},
	]

	const songs = [
		{
			id: 1,
			title: "亡き王女の為のセプテット",
			artist: "ZUN",
			album: "东方红魔乡",
			duration: "3:42",
		},
		{
			id: 2,
			title: "U.N.オーエンは彼女なのか？",
			artist: "ZUN",
			album: "东方红魔乡",
			duration: "3:14",
		},
		{
			id: 3,
			title: "幽雅に咲かせ、墨染の桜",
			artist: "ZUN",
			album: "东方妖妖梦",
			duration: "4:02",
		},
		{
			id: 4,
			title: "少女綺想曲",
			artist: "ZUN",
			album: "东方永夜抄",
			duration: "3:32",
		},
		{
			id: 5,
			title: "恋色マスタースパーク",
			artist: "ZUN",
			album: "东方永夜抄",
			duration: "3:27",
		},
		{
			id: 6,
			title: "今宵は飄逸なエゴイスト",
			artist: "ZUN",
			album: "东方永夜抄",
			duration: "2:56",
		},
		{
			id: 7,
			title: "信仰は儚き人間の為に",
			artist: "ZUN",
			album: "东方风神录",
			duration: "4:12",
		},
		{
			id: 8,
			title: "神々が恋した幻想郷",
			artist: "ZUN",
			album: "东方风神录",
			duration: "3:38",
		},
		{
			id: 9,
			title: "明日ハレの日、ケの昨日",
			artist: "ZUN",
			album: "东方风神录",
			duration: "3:56",
		},
		{
			id: 10,
			title: "芥川龍之介の河童",
			artist: "ZUN",
			album: "东方风神录",
			duration: "4:24",
		},
	]

	const renderContent = () => {
		switch (activeTab()) {
			case "albums":
				return (
					<div class="grid grid-cols-4 gap-6">
						<For each={albums}>
							{(album) => (
								<div class="rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
									<div class="mb-4 overflow-hidden rounded-md">
										<img
											src={album.cover}
											alt={album.title}
											class="aspect-square w-full object-cover"
										/>
									</div>
									<h3 class="truncate text-base font-medium text-gray-800">
										{album.title}
									</h3>
									<p class="mt-1 truncate text-sm text-gray-600">
										{album.artist}
									</p>
									<p class="mt-1 text-xs text-gray-500">{album.year}</p>
								</div>
							)}
						</For>
					</div>
				)
			case "artists":
				return (
					<div class="grid grid-cols-5 gap-5">
						<For each={artists}>
							{(artist) => (
								<div class="rounded-lg bg-white p-4 text-center transition-shadow hover:shadow-md">
									<div class="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-full">
										<img
											src={artist.cover}
											alt={artist.name}
											class="h-full w-full object-cover"
										/>
									</div>
									<h3 class="text-base font-medium text-gray-800">
										{artist.name}
									</h3>
									<p class="mt-1 text-xs text-gray-500">
										{artist.albums} 张专辑
									</p>
								</div>
							)}
						</For>
					</div>
				)
			case "songs":
				return (
					<div class="overflow-hidden rounded-lg bg-white shadow-sm">
						<table class="w-full table-auto">
							<thead class="bg-gray-50 text-xs font-medium tracking-wider text-gray-500 uppercase">
								<tr>
									<th class="px-6 py-3 text-left">#</th>
									<th class="px-6 py-3 text-left">歌曲</th>
									<th class="px-6 py-3 text-left">专辑</th>
									<th class="px-6 py-3 text-left">时长</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200">
								<For each={songs}>
									{(song, index) => (
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
												{index() + 1}
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center">
													<div class="text-sm font-medium text-gray-900">
														{song.title}
													</div>
													<div class="ml-2 text-sm text-gray-500">
														- {song.artist}
													</div>
												</div>
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
												{song.album}
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
												{song.duration}
											</td>
										</tr>
									)}
								</For>
							</tbody>
						</table>
					</div>
				)
			default:
				return null
		}
	}

	return (
		<div class="flex min-h-screen flex-col bg-gray-50">
			<div class="flex flex-1">
				{/* 左侧边栏 */}
				<Sidebar class="w-60 border-r border-gray-200 bg-white shadow-sm">
					<div class="p-4">
						<div class="mb-6">
							<h3 class="mb-2 text-xs font-medium text-gray-500">我的音乐库</h3>
							<ul class="space-y-1">
								<ListItem>
									<CardStackIcon />
									<span>专辑</span>
								</ListItem>
								<ListItem>
									<CardStackIcon />
									<span>歌手</span>
								</ListItem>
								<ListItem>
									<HeartIcon />
									<span>我喜欢的音乐</span>
								</ListItem>
								<ListItem>
									<ClockIcon />
									<span>最近播放</span>
								</ListItem>
							</ul>
						</div>

						<div class="mb-6">
							<h3 class="mb-2 text-xs font-medium text-gray-500">本地音乐</h3>
							<ul class="space-y-1">
								<ListItem>
									<span>已下载</span>
								</ListItem>
							</ul>
						</div>

						<div>
							<h3 class="mb-2 text-xs font-medium text-gray-500">我的收藏</h3>
							<ul class="space-y-1">
								<ListItem>
									<span>东方同音鉴精选集</span>
								</ListItem>
								<ListItem>
									<span>幻想乡名曲TOP50</span>
								</ListItem>
							</ul>
						</div>
					</div>
				</Sidebar>

				{/* 主内容区域 */}
				<div class="flex-1 overflow-auto">
					<div class="p-6">
						<Title>音乐库 - 东方同音鉴</Title>

						<div class="mb-6">
							<h1 class="mb-6 text-2xl font-bold text-gray-800">音乐库</h1>

							{/* 标签页切换 */}
							<div class="mb-6 flex space-x-4 border-b border-gray-200">
								<button
									class={`relative px-1 pb-2 text-sm font-medium transition-colors ${
										activeTab() === "albums" ?
											"border-b-2 border-rose-600 text-rose-600"
										:	"text-gray-600 hover:text-gray-900"
									}`}
									onClick={() => setActiveTab("albums")}
								>
									专辑
								</button>
								<button
									class={`relative px-1 pb-2 text-sm font-medium transition-colors ${
										activeTab() === "artists" ?
											"border-b-2 border-rose-600 text-rose-600"
										:	"text-gray-600 hover:text-gray-900"
									}`}
									onClick={() => setActiveTab("artists")}
								>
									歌手
								</button>
								<button
									class={`relative px-1 pb-2 text-sm font-medium transition-colors ${
										activeTab() === "songs" ?
											"border-b-2 border-rose-600 text-rose-600"
										:	"text-gray-600 hover:text-gray-900"
									}`}
									onClick={() => setActiveTab("songs")}
								>
									歌曲
								</button>
							</div>

							{/* 内容区域 */}
							{renderContent()}
						</div>
					</div>
				</div>
			</div>

			{/* 播放器 */}
			<Player />
		</div>
	)
}
