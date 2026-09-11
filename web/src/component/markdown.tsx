import { createAsync } from "@solidjs/router"
import { createEffect, Show } from "solid-js"
import type { JSX } from "solid-js"

import type { nil } from "~/type"
import { useMarkdown } from "~/utils/markdown"

function RenderedMarkdown(props: { content: DocumentFragment }) {
	let container: HTMLDivElement | undefined

	createEffect(() => {
		container?.replaceChildren(props.content.cloneNode(true))
	})

	return (
		<div
			ref={(element) => {
				container = element
			}}
			class="markdown"
		></div>
	)
}

type Props = {
	content?: string | nil
	fallback?: JSX.Element
	onRendered: () => void
}

export function Markdown(props: Props) {
	const md = useMarkdown()
	const parsed = createAsync(async () => {
		if (props.content) {
			const content = await md()?.render(props.content)
			if (content === undefined) return undefined

			props.onRendered()
			return content
		}
		return undefined
	})

	return (
		<Show
			when={parsed()}
			fallback={props.fallback}
		>
			{(content) => <RenderedMarkdown content={content()} />}
		</Show>
	)
}
