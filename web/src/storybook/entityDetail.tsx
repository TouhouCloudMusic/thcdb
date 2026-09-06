import type { UserProfile } from "@thc/api"
import type { ParentProps } from "solid-js"
import { onCleanup } from "solid-js"
import { createJSXDecorator } from "storybook-solidjs-vite"

import { StateProvider } from "~/state"

const STORY_PROFILE = {
	id: 1,
	name: "Hakurei Reimu",
	last_login: "2026-08-17T09:30:00.000Z",
	permissions: [],
	roles: [],
	stats: {
		edit_count: 152,
		vote_count: 57,
	},
} satisfies UserProfile

const STORY_TAGS = {
	status: "Ok",
	data: {
		items: [
			{
				id: 101,
				name: "Touhou arrangement",
				short_description: "Arrangement based on music from Touhou Project.",
				count: 18,
				relevance: 2.8,
				user_vote: 3,
				votes: [{ user_name: "Hakurei Reimu", score: 3 }],
			},
			{
				id: 102,
				name: "Electronic",
				short_description: "Electronic production and instrumentation.",
				count: 11,
				relevance: 1.7,
				user_vote: null,
				votes: [],
			},
		],
		next_cursor: null,
	},
}

const STORY_COMMENTS = {
	status: "Ok",
	data: {
		items: [],
		next_cursor: null,
		active_count: 0,
	},
}

function requestPath(input: Parameters<typeof fetch>[0]) {
	const url = input instanceof Request ? input.url : input.toString()
	return new URL(url, globalThis.location.href).pathname
}

function EntityDetailStoryState(props: ParentProps) {
	const originalFetch = globalThis.fetch
	globalThis.fetch = async (input, init) => {
		const path = requestPath(input)
		if (path === "/api/profile") {
			return Response.json({ status: "Ok", data: STORY_PROFILE })
		}
		if (/^\/api\/(artist|release|song)\/\d+\/tags$/u.test(path)) {
			return Response.json(STORY_TAGS)
		}
		if (
			/^\/api\/(artist|release|song|tag|event|label)\/\d+\/comments$/u.test(
				path,
			)
		) {
			return Response.json(STORY_COMMENTS)
		}

		return originalFetch(input, init)
	}

	onCleanup(() => {
		globalThis.fetch = originalFetch
	})

	return <StateProvider initialLocale="en">{props.children}</StateProvider>
}

export const withEntityDetailStoryState = createJSXDecorator((Story) => (
	<EntityDetailStoryState>
		<Story />
	</EntityDetailStoryState>
))
