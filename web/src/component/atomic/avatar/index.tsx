import type { UserProfile } from "@thc/api"
import type { JSX } from "solid-js"
import { createSignal, Match, splitProps, Suspense, Switch } from "solid-js"
import { twMerge } from "tailwind-merge"

import { imgUrl } from "~/utils/adapter/static_file"

const getAvatarText = (user: UserProfile | undefined) => {
	const value = user?.name.trim() ?? ""
	if (value.length === 0) return "?"
	return value.slice(0, 1).toUpperCase()
}

export interface Props extends Omit<
	JSX.ImgHTMLAttributes<HTMLImageElement>,
	"src" | "onError"
> {
	user?: UserProfile | undefined
}

export function Avatar(props: Props) {
	const [failedSrc, setFailedSrc] = createSignal<string | undefined>(undefined)
	const [loadedSrc, setLoadedSrc] = createSignal<string | undefined>(undefined)

	const [_, otherProps] = splitProps(props, ["class", "user"])

	const imageSrc = () => imgUrl(props.user?.avatar_url)
	const validSrc = () => {
		const src = imageSrc()
		if (!src) return
		if (failedSrc() === src) return
		return src
	}
	const avatarText = () => getAvatarText(props.user)

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
			<div
				class={twMerge(
					"size-8 overflow-hidden rounded-full",
					!validSrc() && "border border-slate-200 bg-slate-100 text-slate-700",
					props.class,
				)}
			>
				<Switch>
					<Match when={validSrc()}>
						{(src) => {
							const isPending = () => loadedSrc() !== src()
							const handleLoad = () => {
								setLoadedSrc(src())
							}
							const handleError = () => {
								setFailedSrc(src())
							}

							return (
								<img
									{...otherProps}
									src={src()}
									alt={
										props.alt
										?? props.user?.name
										// @wc-include
										?? "avatar"
									}
									onLoad={handleLoad}
									onError={handleError}
									class={twMerge(
										"size-full object-cover",
										isPending() && "animate-pulse",
									)}
								/>
							)
						}}
					</Match>
					<Match when={!validSrc()}>
						<div class="flex h-full w-full items-center justify-center text-sm font-medium">
							{avatarText()}
						</div>
					</Match>
				</Switch>
			</div>
		</Suspense>
	)
}
