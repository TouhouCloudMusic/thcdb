import { createMemo, For } from "solid-js"

type Banner = { id: number; imageUrl: string; title: string }
type BannerProps = {
	banners: Banner[]
}

export function Banner(props: BannerProps) {
	// 选择当前显示的轮播图
	const currentBanner = createMemo(() => props.banners[0]!)

	return (
		<div class="mb-8">
			<div class="relative h-64 overflow-hidden rounded-lg shadow-md">
				<img
					src={currentBanner().imageUrl}
					alt={currentBanner().title}
					class="h-full w-full object-cover"
				/>
				<div class="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent p-4">
					<h2 class="text-xl font-bold text-white">{currentBanner().title}</h2>
				</div>

				<div class="absolute right-3 bottom-3 flex space-x-2">
					<For each={props.banners}>
						{(banner, index) => (
							<div
								class={`h-2 w-2 rounded-full ${index() === 0 ? "bg-white" : "bg-white/50"}`}
							></div>
						)}
					</For>
				</div>
			</div>
		</div>
	)
}
