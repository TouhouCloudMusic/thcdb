import { twMerge } from "tailwind-merge"

type HomeEmptySlotProps = {
	label?: string
	class?: string
}

const BASE_CLASS =
	"grid min-h-24 place-items-center rounded-none bg-gradient-to-br from-white/75 via-slate-50/55 to-white/70"

export function HomeEmptySlot(props: HomeEmptySlotProps) {
	const className = () => twMerge(BASE_CLASS, props.class)

	return (
		<div class={className()}>
			<div class="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-tertiary">
				<span class="inline-block size-1.5 rounded-full bg-slate-300"></span>
				{props.label ?? "No data"}
			</div>
		</div>
	)
}
