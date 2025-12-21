import type { LinkComponentProps } from "@tanstack/solid-router"
import { Link as RouterLink } from "@tanstack/solid-router"
import { twMerge } from "tailwind-merge"

const LINK_CLASS =
	"text-primary underline-offset-4 transition-colors hover:underline"

export type LinkProps = LinkComponentProps<"a">

export function Link(props: LinkProps) {
	let className = () => twMerge(LINK_CLASS, props.class)

	return (
		<RouterLink
			{...props}
			class={className()}
		/>
	)
}
