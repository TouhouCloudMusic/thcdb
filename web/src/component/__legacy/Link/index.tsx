import { createMemo, splitProps } from "solid-js"
import type { JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { SafeOmit } from "~/type"

interface LinkProps<T extends Entity>
	extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
	to: T["type"]
	params: SafeOmit<T, "type">
	children?: JSX.Element
}

export function Link<T extends Entity>(props: LinkProps<T>) {
	const [, otherProps] = splitProps(props, ["to", "params", "class"])

	const classMemo = createMemo(() => twMerge(Link.className, props.class))

	const href = () => {
		switch (props.to) {
			case "artist": {
				return `/artist/${props.params.id}`
			}
			case "user": {
				return `/user/${props.params.id}`
			}
			case "song": {
				return `/song/${props.params.id}`
			}
			case "release": {
				return `/release/${props.params.id}`
			}
			default: {
				return `/${props.to}`
			}
		}
	}

	return (
		<a
			{...otherProps}
			href={href()}
			class={classMemo()}
		>
			{props.children}
		</a>
	)
}

// @tw
Link.className =
	"text-blue-700 hover:text-blue-500 hover:underline focus-within:outline-blue-700 outline-offset-4 "

type Entity = ArtistParams | UserParams | SongParams | ReleaseParams

interface ArtistParams {
	type: "artist"
	id: number
}

interface UserParams {
	type: "user"
	id: number
}

interface SongParams {
	type: "song"
	id: number
}

interface ReleaseParams {
	type: "release"
	id: number
}
