import type { UserProfile } from "@thc/api"
import type { JSX } from "solid-js"
import { createSignal, Show, splitProps, Suspense } from "solid-js"
import { twMerge } from "tailwind-merge"

import { imgUrl } from "~/utils/adapter/static_file"

// 默认头像路径
const DEFAULT_AVATAR = "/Admin.jpg"

export interface Props extends Omit<
	JSX.ImgHTMLAttributes<HTMLImageElement>,
	"src" | "onError"
> {
	user?: UserProfile | undefined
}

const enum ImageLoadingState {
	Loaded,
	Pending,
	Err,
}

export function Avatar(props: Props) {
	const [imageState, setImageState] = createSignal(ImageLoadingState.Pending)

	const [_, otherProps] = splitProps(props, ["class", "user"])

	return (
		<Suspense
			fallback={
				<div
					class={twMerge(
						"size-8 animate-pulse items-center justify-center rounded-full bg-slate-200",
						props.class,
					)}
				></div>
			}
		>
			<Show
				when={props.user}
				fallback={
					<img
						{...otherProps}
						src={DEFAULT_AVATAR}
						alt="默认头像"
						class={twMerge("size-8 rounded-full object-cover", props.class)}
					/>
				}
			>
				{(user) => (
					<img
						{...otherProps}
						src={imgUrl(user().avatar_url)}
						alt={props.alt ?? "avatar"}
						onLoad={() => {
							setImageState(ImageLoadingState.Loaded)
						}}
						onError={() => {
							setImageState(ImageLoadingState.Err)
						}}
						class={twMerge(
							"size-8 rounded-full object-cover",
							imageState() === ImageLoadingState.Pending && "animate-pulse",
							props.class,
						)}
					/>
				)}
			</Show>
		</Suspense>
	)
}
