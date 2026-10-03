import type { UserProfile } from "@thc/api"
import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import baka from "~/component/atomic/avatar/baka.jpg"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { createEditProfileStore, EditProfileView } from "."

const USER: UserProfile = {
	id: 1,
	name: "Hakurei Reimu",
	last_login: "2026-10-04T09:30:00Z",
	avatar_url: new URL(baka, globalThis.location.origin).href,
	bio: "收集东方音乐的发行、歌曲与艺术家资料。",
	roles: [{ id: 1, name: "Moderator" }],
	stats: { edit_count: 152, vote_count: 57 },
}

function StoryRoot() {
	const [bio, setBio] = createSignal(USER.bio ?? "")
	const store = createEditProfileStore({
		baseBio: bio,
		saveBio: (next) => {
			setBio(next)
			return Promise.resolve()
		},
		uploadAvatar: () => Promise.resolve(),
		uploadBanner: () => Promise.resolve(),
	})
	return (
		<EditProfileView
			user={USER}
			store={store}
		/>
	)
}

const meta = {
	title: "View/User/EditProfile",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: { layout: StoryLayout.FullScreen },
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
