import { createAsync } from "@solidjs/router"

import type { Nullable } from "~/types"
import { useMarkdown } from "~/utils/markdown"

type Props = {
	content?: Nullable<string>
	fallback?: string | undefined
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
		return props.fallback
	})

	return (
		<div
			// eslint-disable-next-line solid/no-innerhtml
			innerHTML={parsed()}
			class="markdown"
		></div>
	)
}
