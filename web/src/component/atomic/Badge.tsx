import type { ComponentProps, ParentProps } from "solid-js"
import { mergeProps, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { AppColor } from "~/component"

type Props = ParentProps<ComponentProps<"div">> & {
	color?: AppColor
}

const BASE_CLASS =
	"inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ring-inset"
const DEFAULT_COLOR: AppColor = "Slate"

const COLOR_CLASS: Record<AppColor, string> = {
	Reimu: "bg-reimu-100 text-reimu-800 ring-reimu-200",
	Marisa: "bg-marisa-100 text-marisa-800 ring-marisa-200",
	Blue: "bg-blue-100 text-blue-800 ring-blue-200",
	Green: "bg-green-100 text-green-800 ring-green-200",
	Gray: "bg-slate-100 text-slate-800 ring-slate-200",
	Slate: "bg-slate-100 text-slate-800 ring-slate-200",
}

export function Badge(props: Props) {
	let [local, otherProps] = splitProps(props, ["class", "children", "color"])

	let finalProps = mergeProps(otherProps, {
		get class() {
			let colorClass = COLOR_CLASS[local.color ?? DEFAULT_COLOR]

			if (local.class) {
				return twMerge(BASE_CLASS, colorClass, local.class)
			}

			return twMerge(BASE_CLASS, colorClass)
		},
	})

	return (
		<div {...finalProps}>
			<span class="inline-block size-1.5 rounded-full bg-current opacity-70" />
			{local.children}
		</div>
	)
}
