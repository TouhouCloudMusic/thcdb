import { t } from "@lingui/core/macro"
import { createSignal, For } from "solid-js"

type NavItem = {
	id: string
	label: string
	active?: boolean
}

export function Navbar() {
	const [items, setItems] = createSignal<NavItem[]>([
		{ id: "recommend", label: t`推荐`, active: true },
		{ id: "playlist", label: t`歌单` },
		{ id: "rank", label: t`排行榜` },
		{ id: "artist", label: t`歌手` },
		{ id: "album", label: t`专辑` },
		{ id: "doujin", label: t`同人社团` },
		{ id: "video", label: t`视频` },
		{ id: "article", label: t`文章` },
		{ id: "event", label: t`活动` },
	])

	const setActive = (id: string) => {
		setItems((prev) =>
			prev.map((item) => ({
				...item,
				active: item.id === id,
			})),
		)
	}

	return (
		<div class="sticky top-0 z-10 bg-white shadow-sm">
			<div class="hide-scrollbar flex items-center space-x-6 overflow-x-auto px-6">
				<For each={items()}>
					{(item) => (
						<button
							class={`relative py-4 text-sm font-medium whitespace-nowrap transition-colors ${
								item.active
									? "text-rose-600"
									: "text-slate-600 hover:text-slate-900"
							}`}
							onClick={() => setActive(item.id)}
						>
							{item.label}
							{item.active && (
								<div class="bg-rose-600 absolute right-0 bottom-0 left-0 h-0.5 rounded-full"></div>
							)}
						</button>
					)}
				</For>
			</div>
		</div>
	)
}
