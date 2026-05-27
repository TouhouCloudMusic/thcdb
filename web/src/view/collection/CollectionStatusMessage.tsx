import type { ParentProps } from "solid-js"

export function CollectionStatusMessage(props: ParentProps) {
	return (
		<div class="py-8 text-center text-sm text-tertiary">{props.children}</div>
	)
}
