import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ComponentProps, JSX, ParentProps } from "solid-js"
import {
	mergeProps,
	splitProps,
	createContext,
	useContext,
	Show,
	createEffect,
} from "solid-js"
import { createStore } from "solid-js/store"
import { Portal } from "solid-js/web"

import type { ThumbnailSize } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { imgUrl } from "~/utils/adapter/static_file"
import { callHandlerUnion } from "~/utils/dom/event"

export const enum State {
	Loading,
	Error,
	Ok,
}

type ImageContext = {
	state: State
	setState: (state: State) => void
	isOk: boolean
	isLoading: boolean
	isError: boolean
	src?: string
	setSrc: (src?: string) => void
	alt?: string
	setAlt: (alt?: string) => void
}

const ImageContext = createContext<ImageContext>()

type RootProps = ParentProps

export function Root(props: RootProps) {
	const [store, setStore] = createStore<ImageContext>({
		state: State.Loading,
		setState(state) {
			setStore("state", state)
		},
		get isLoading() {
			return this.state === State.Loading
		},
		get isError() {
			return this.state === State.Error
		},
		get isOk() {
			return this.state === State.Ok
		},
		setSrc(src) {
			setStore("src", src)
		},
		setAlt(alt) {
			setStore("alt", alt)
		},
	})

	return (
		<ImageContext.Provider value={store}>
			{props.children}
		</ImageContext.Provider>
	)
}

type ImgProps = Omit<ComponentProps<"img">, "class"> & {
	styles?: StyleXStyles
}

const styles = stylex.create({
	image: { objectFit: "cover" },
	preview: {
		position: "fixed",
		inset: 0,
		zIndex: 50,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: palette.black,
		margin: 0,
		cursor: "zoom-out",
		appearance: "none",
		borderStyle: "none",
		padding: 0,
	},
	previewImage: { maxHeight: "90%", maxWidth: "90%", objectFit: "contain" },
})
function Img(props: ImgProps) {
	const context = useContext(ImageContext)!

	createEffect(() => {
		context.setSrc(props.src)
	})

	createEffect(() => {
		context.setAlt(props.alt)
	})

	const [local, rest] = splitProps(props, ["styles"])
	const img_props = mergeProps(rest, {
		onLoad(e) {
			context.setState(State.Ok)
			callHandlerUnion(e, props.onLoad)
		},
		onError(e) {
			context.setState(State.Error)
			callHandlerUnion(e, props.onError)
		},
	} satisfies Partial<ComponentProps<"img">>)

	return (
		<Show when={!context.isError && props.src}>
			<img
				{...img_props}
				{...stylex.attrs(styles.image, local.styles)}
				alt={props.alt ?? ""}
			/>
		</Show>
	)
}

type OriginalProps = Omit<ImgProps, "src"> & {
	url: string | URL | null | undefined
}

export function Original(props: OriginalProps) {
	const [local, imageProps] = splitProps(props, ["url"])
	return (
		<Img
			{...imageProps}
			src={imgUrl(local.url)}
		/>
	)
}

type ThumbnailProps = Omit<ImgProps, "src"> & {
	url: string | URL | null | undefined
	size: ThumbnailSize
}

export function Thumbnail(props: ThumbnailProps) {
	const [local, imageProps] = splitProps(props, ["url", "size"])
	return (
		<Img
			{...imageProps}
			src={imgUrl(local.url, local.size)}
		/>
	)
}

type FallbackProps = {
	children: (props: Omit<State, State.Ok>) => JSX.Element
}

export function Fallback(props: FallbackProps) {
	const context = useContext(ImageContext)!
	return (
		<Show when={context.state !== State.Ok}>
			{props.children(context.state)}
		</Show>
	)
}

export type PreiewProps = {
	styles?: StyleXStyles
	open?: boolean
	close?: () => void
}
export function Preview(props: PreiewProps) {
	const context = useContext(ImageContext)!

	const handleKeyToggle = (e: KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			props.close?.()
		}
	}

	return (
		<Show when={props.open}>
			<Portal>
				<button
					type="button"
					onClick={() => props.close?.()}
					onKeyDown={(e) => handleKeyToggle(e)}
					{...stylex.attrs(styles.preview, props.styles)}
				>
					<img
						src={context.src}
						alt={context.alt}
						{...stylex.attrs(styles.previewImage)}
					/>
				</button>
			</Portal>
		</Show>
	)
}
