import { createSignal, Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { CursorResponseUserImageQueueItem } from "~/hey-api"
import { ready } from "~/type/asyncData"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { UserImageQueuePage } from "./user"

const ITEMS: CursorResponseUserImageQueueItem["items"] = [
	{
		id: 1042,
		image_id: 18,
		status: "Pending",
		created_at: "2026-10-04T09:30:00Z",
	},
	{
		id: 1041,
		image_id: 17,
		status: "Approved",
		created_at: "2026-10-03T09:30:00Z",
		handled_at: "2026-10-03T10:00:00Z",
		handled_by: { id: 2, name: "Kirisame Marisa" },
	},
	{
		id: 1040,
		image_id: 16,
		status: "Rejected",
		created_at: "2026-10-02T09:30:00Z",
		handled_at: "2026-10-02T10:00:00Z",
		handled_by: { id: 2, name: "Kirisame Marisa" },
	},
]

type StoryState = "list" | "empty" | "loading" | "error"

function HistoryExample(props: { initialState: StoryState }) {
	const [state, setState] = createSignal(props.initialState)
	return (
		<UserImageQueuePage
			list={(() => {
				const kind = state()
				if (kind === "error") return { kind, retry: () => setState("list") }
				if (kind === "loading") return { kind }
				return ready({
					items: kind === "list" ? ITEMS : [],
					pagination: { kind: "end" },
				})
			})()}
		/>
	)
}

function StoryRoot(props: { state: StoryState }) {
	return (
		<Show
			when={props.state}
			keyed
		>
			{(state) => <HistoryExample initialState={state} />}
		</Show>
	)
}

const meta = {
	title: "Page/UserImageQueuePage",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: { layout: StoryLayout.FullScreen },
	args: { state: "list" },
	argTypes: {
		state: { control: "radio", options: ["list", "empty", "loading", "error"] },
	},
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
