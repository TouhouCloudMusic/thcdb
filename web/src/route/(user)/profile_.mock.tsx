import { createFileRoute } from "@tanstack/solid-router"
import type { UserProfile } from "@thc/api"
import { createSignal, For } from "solid-js"
import { twMerge } from "tailwind-merge"

import baka from "~/component/atomic/avatar/baka.jpg"
import { Button } from "~/component/atomic/button"
import { Profile } from "~/view/user/Profile"

export const Route = createFileRoute("/(user)/profile_/mock")({
	component: RouteComponent,
})

type MockCase = {
	label: string
	isCurrentUser: boolean
	data: UserProfile
}

const ORIGIN = globalThis.location?.origin ?? "http://localhost:3000"
const assetUrl = (path: string) => new URL(path, ORIGIN).href

const CASES = [
	{
		label: "Wide banner",
		isCurrentUser: true,
		data: {
			name: "Hakurei Reimu",
			last_login: "2025-12-28T09:30:00.000Z",
			avatar_url: assetUrl(baka),
			banner_url: assetUrl("/img/cover/release/1.png"),
			roles: [
				{
					id: 1,
					name: "Admin",
				},
				{
					id: 2,
					name: "Moderator",
				},
			],
			bio: [
				"在这里检查 **banner** 的裁切与叠层、头像的 ring / shadow。",
				"",
				"- Banner: `object-cover`",
				"- Avatar: `object-cover` + ring",
				"",
				"> 这是一段引用，用来检查 markdown 的样式。",
			].join("\n"),
		},
	},
	{
		label: "No banner",
		isCurrentUser: false,
		data: {
			name: "A very very long username to test truncation in header",
			last_login: "2025-12-28T09:30:00.000Z",
			avatar_url: assetUrl(baka),
			is_following: true,
			roles: [
				{
					id: 1,
					name: "Moderator",
				},
			],
			bio: "空的 banner 时应该显示纯色背景（无网格 / mask）。",
		},
	},
	{
		label: "Logo crop",
		isCurrentUser: false,
		data: {
			name: "Logo Crop Test",
			last_login: "2025-12-28T09:30:00.000Z",
			avatar_url: assetUrl("/img/logo.png"),
			banner_url: assetUrl("/img/logo.png"),
			is_following: false,
			roles: [],
			bio: "使用 `logo.png` 测试 banner / avatar 的裁切效果。",
		},
	},
] satisfies [MockCase, ...MockCase[]]

function RouteComponent() {
	const [selectedIndex, setSelectedIndex] = createSignal(0)
	const selected = () => CASES[selectedIndex()] ?? CASES[0]

	return (
		<>
			<div class="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)]">
				<div class="flex flex-col gap-3 rounded-md border border-slate-300 bg-white/80 p-3 shadow-xs ring-1 ring-slate-200/60 backdrop-blur-sm ring-inset">
					<div class="text-xs font-medium tracking-[0.18em] text-slate-500">
						PROFILE MOCK
					</div>
					<div class="flex flex-wrap gap-2">
						<For each={CASES}>
							{(item, index) => (
								<Button
									size="Xs"
									variant={
										selectedIndex() === index() ? "Primary" : "Secondary"
									}
									color={selectedIndex() === index() ? "Reimu" : "Slate"}
									class={twMerge(
										"px-3",
										selectedIndex() === index() && "shadow-sm",
									)}
									onClick={() => setSelectedIndex(index())}
								>
									{item.label}
								</Button>
							)}
						</For>
					</div>
				</div>
			</div>
			<Profile
				data={selected().data}
				isCurrentUser={selected().isCurrentUser}
			/>
		</>
	)
}
