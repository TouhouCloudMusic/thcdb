import {
	createSignal,
	type JSX,
	type Resource,
	Show,
	splitProps,
	Suspense,
} from "solid-js"
import { twMerge } from "tailwind-merge"
import { type UserProfile } from "~/api/user"
import { imgUrl } from "~/utils/adapter/static_file"

export interface Props
	extends Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
	user?: Resource<UserProfile>
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
					<div
						class={twMerge(
							"flex size-8 items-center justify-center rounded-full bg-slate-200",
							props.class,
						)}
					>
						<span class="text-slate-500">N/A</span>
					</div>
				}
			>
				{(user) => (
					<img
						{...otherProps}
						src={imgUrl(user()()?.avatar_url)}
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
