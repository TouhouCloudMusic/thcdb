import { createFileRoute } from "@tanstack/solid-router"
import type { UserProfile } from "@thc/api"
import { createSignal } from "solid-js"

import baka from "~/component/atomic/avatar/baka.jpg"
import {
	createEditProfileStore,
	EditProfileView,
} from "~/view/user/edit_profile"

export const Route = createFileRoute("/(user)/test_avatar_upload")({
	component: RouteComponent,
})

const ORIGIN = globalThis.location?.origin ?? "http://localhost:3000"
const assetUrl = (path: string) => new URL(path, ORIGIN).href

const delay = (ms: number) =>
	new Promise<void>((resolve) => {
		globalThis.setTimeout(resolve, ms)
	})

function RouteComponent() {
	const [user, setUser] = createSignal<UserProfile>({
		name: "Hakurei Reimu",
		last_login: "2025-12-28T09:30:00.000Z",
		avatar_url: assetUrl(baka),
		banner_url: assetUrl("/img/cover/release/1.png"),
		roles: [
			{
				id: 1,
				name: "Admin",
			},
		],
		bio: [
			"这是一个 `mock route`：用来测试编辑页的 UI / cropper / 保存逻辑。",
			"",
			"- 输入包含 `error` 会触发 mock 错误",
			"- 上传超过 5MB 会触发 mock 错误",
		].join("\n"),
	})

	const baseBio = () => user().bio ?? ""
	const store = createEditProfileStore({
		baseBio,
		saveBio: async (next) => {
			await delay(650)

			if (next.includes("error")) {
				throw new Error("Mock: bio rejected by server.")
			}

			setUser((prev) => ({
				...prev,
				bio: next,
			}))
		},
		uploadAvatar: async (file) => {
			await delay(650)

			if (file.size > 5 * 1024 * 1024) {
				throw new Error("Mock: avatar too large (> 5MB).")
			}

			const url = globalThis.URL.createObjectURL(file)
			setUser((prev) => ({
				...prev,
				avatar_url: url,
			}))
		},
		uploadBanner: async (file) => {
			await delay(650)

			if (file.size > 5 * 1024 * 1024) {
				throw new Error("Mock: banner too large (> 5MB).")
			}

			const url = globalThis.URL.createObjectURL(file)
			setUser((prev) => ({
				...prev,
				banner_url: url,
			}))
		},
	})

	return (
		<EditProfileView
			user={user()}
			store={store}
		/>
	)
}
