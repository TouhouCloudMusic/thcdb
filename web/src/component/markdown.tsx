import { createAsync } from "@solidjs/router"
import { Show } from "solid-js"
import type { JSX } from "solid-js"

import type { nil } from "~/type"
import { useMarkdown } from "~/utils/markdown"

type Props = {
	content?: string | nil
	fallback?: JSX.Element
	onRendered: () => void
}
export function Markdown(props: Props) {
	const md = useMarkdown()
	const parsed = createAsync(async () => {
		if (props.content) {
			const ret = await md()?.render(props.content)

			props.onRendered()
			return ret
		}
		return ""
	})

	return (
		<Show
			when={parsed()}
			fallback={props.fallback}
		>
			{(p) => (
				<div
					innerHTML={p()}
					class="markdown"
				></div>
			)}
		</Show>
	)
}
