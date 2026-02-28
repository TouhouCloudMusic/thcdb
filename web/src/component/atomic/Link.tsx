import type { LinkComponentProps } from "@tanstack/solid-router"
import { Link as RouterLink } from "@tanstack/solid-router"
import { twMerge } from "tailwind-merge"

const LINK_CLASS = "text-primary underline-offset-4 transition-colors"

export type LinkProps = LinkComponentProps & {
	/**
	 * Whether the underline shows on hover.
	 * Default: `true`
	 */
	underline?: boolean
}

export function Link(props: LinkProps) {
	const className = () => {
		const underline = props.underline ?? true
		return twMerge(LINK_CLASS, underline && "hover:underline", props.class)
	}

	return (
		<RouterLink
			{...props}
			class={className()}
		/>
	)
}
