import { Link } from "@tanstack/solid-router"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { Show, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export function Thumbnail(
	props: Omit<LinkComponentProps, "children"> & {
		src: string | undefined
		"aria-label": string
		imageClass?: string
	},
) {
	const [local, linkProps] = splitProps(props, ["src", "class", "imageClass"])

	return (
		<Show
			when={local.src}
			fallback={<div class={twMerge("bg-secondary", local.class)}></div>}
		>
			{(src) => (
				<Link
					{...linkProps}
					class={twMerge(
						"bg-secondary text-primary focus-visible:ring-slate-200",
						local.class,
					)}
				>
					<img
						src={src()}
						alt=""
						class={local.imageClass}
						loading="lazy"
					/>
				</Link>
			)}
		</Show>
	)
}
