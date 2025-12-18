import { For } from "solid-js"

export function NewMusic() {
	return (
		<div>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold text-slate-800">最新音乐</h2>
				<button
					type="button"
					class="text-rose-600 hover:text-rose-700 text-sm"
				>
					查看更多
				</button>
			</div>

			<div class="rounded-lg bg-white p-4 shadow">
				<div class="grid grid-cols-2 gap-4">
					<For each={Array.from({ length: 6 }).fill(0)}>
						{(_, i) => (
							<div class="flex items-center rounded-md p-2 hover:bg-slate-100">
								<div class="bg-rose-100 h-10 w-10 flex-shrink-0 overflow-hidden rounded">
									<img
										src={`https://placehold.co/100x100/red/white?text=${i() + 1}`}
										alt="封面"
										class="h-full w-full object-cover"
									/>
								</div>
								<div class="ml-3 flex-1 overflow-hidden">
									<h4 class="truncate text-sm font-medium text-slate-800">
										东方同音鉴曲目 {i() + 1}
									</h4>
									<p class="truncate text-xs text-slate-500">幻想乡音乐人</p>
								</div>
								<button class="hover:text-rose-600 p-2 text-slate-400">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										></path>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										></path>
									</svg>
								</button>
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	)
}
