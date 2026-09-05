import type { ParentProps } from "solid-js"

type ExploreFilterFieldProps = ParentProps<{
	label: string
}>

export function ExploreFilterField(props: ExploreFilterFieldProps) {
	return (
		<div class="grid min-w-0 gap-2 contain-layout">
			<span class="text-sm text-tertiary">{props.label}</span>
			{props.children}
		</div>
	)
}
