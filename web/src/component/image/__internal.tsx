import * as kDialog from "@kobalte/core/dialog"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Accessor, ComponentProps, JSX, ParentProps } from "solid-js"
import {
	createContext,
	createMemo,
	createSignal,
	Show,
	splitProps,
	useContext,
} from "solid-js"

import { Dialog } from "~/component/dialog"
import type { ThumbnailSize } from "~/hey-api"
import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"
import { callHandlerUnion } from "~/utils/dom/event"
import { assertContext } from "~/utils/solid/assertContext"

export const enum State {
	Loading,
	Error,
	Ok,
	Missing,
}

type LoadState = Exclude<State, State.Missing>
type FallbackState = Exclude<State, State.Ok>

type ImageSource = {
	src: string
	hasFailed: Accessor<boolean>
	markLoaded: () => void
	markFailed: () => void
}

type ImageContext = {
	source: Accessor<ImageSource | undefined>
	fallbackState: Accessor<FallbackState | undefined>
	originalSrc: Accessor<string | undefined>
}

const ImageContext = createContext<ImageContext>()

type RootProps = ParentProps<{
	url: string | URL | null | undefined
	size?: ThumbnailSize
}>

export function Root(props: RootProps) {
	const originalSrc = createMemo(() => imgUrl(props.url))
	const src = createMemo(() =>
		props.size === undefined ? originalSrc() : imgUrl(props.url, props.size),
	)
	const image = createMemo(() => {
		const currentSrc = src()
		if (!currentSrc) return

		const [loadState, setLoadState] = createSignal<LoadState>(State.Loading)
		return {
			loadState,
			source: {
				src: currentSrc,
				hasFailed: () => loadState() === State.Error,
				markLoaded: () => setLoadState(State.Ok),
				markFailed: () => setLoadState(State.Error),
			},
		}
	})
	const source = () => image()?.source
	const fallbackState = () => {
		const state = image()?.loadState() ?? State.Missing
		return state === State.Ok ? undefined : state
	}

	return (
		<ImageContext.Provider value={{ source, fallbackState, originalSrc }}>
			{props.children}
		</ImageContext.Provider>
	)
}

const styles = stylex.create({
	image: { objectFit: "cover" },
	fallback: {
		display: "grid",
		placeItems: "center",
		padding: px[8],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
		backgroundColor: colors.backgroundSecondary,
	},
})

type ImgProps = Omit<ComponentProps<"img">, "class" | "src"> & {
	styles?: StyleXStyles
}

export function Img(props: ImgProps) {
	const { source } = assertContext(ImageContext, "ImageContext")
	const [local, imageProps] = splitProps(props, [
		"alt",
		"styles",
		"onLoad",
		"onError",
	])
	return (
		<Show
			when={source()}
			keyed
		>
			{(image) => (
				<Show when={!image.hasFailed()}>
					<img
						{...imageProps}
						{...stylex.attrs(styles.image, local.styles)}
						src={image.src}
						alt={local.alt ?? ""}
						onLoad={(event) => {
							image.markLoaded()
							callHandlerUnion(event, local.onLoad)
						}}
						onError={(event) => {
							image.markFailed()
							callHandlerUnion(event, local.onError)
						}}
					/>
				</Show>
			)}
		</Show>
	)
}

function DefaultFallback(props: { state: FallbackState }) {
	const { t } = useLingui()
	const label = () => {
		switch (props.state) {
			case State.Loading: {
				return t`Loading…`
			}
			case State.Error: {
				return t`Failed to load image`
			}
			case State.Missing: {
				return t`No image`
			}
		}
	}

	return <div {...stylex.attrs(styles.fallback)}>{label()}</div>
}

type FallbackProps = {
	state?: FallbackState
	children?: (state: FallbackState) => JSX.Element
}

export function Fallback(props: FallbackProps) {
	const context = useContext(ImageContext)
	const fallback = createMemo(() => {
		const state = props.state ?? context?.fallbackState()
		return state === undefined ? undefined : { state }
	})

	return (
		<Show
			when={fallback()}
			keyed
		>
			{({ state }) =>
				props.children ? (
					props.children(state)
				) : (
					<DefaultFallback state={state} />
				)
			}
		</Show>
	)
}

const VIEWER_MAX_HEIGHT = "75dvh"

const previewStyles = stylex.create({
	content: {
		position: "fixed",
		zIndex: 50,
		left: "50%",
		top: "50%",
		translate: "-50% -50%",
		width: "max-content",
		outline: "none",
	},
	image: {
		display: "block",
		height: "auto",
		maxWidth: `min(90dvw, calc(100dvw - ${px[32]}))`,
		maxHeight: VIEWER_MAX_HEIGHT,
		objectFit: "contain",
	},
	imageSize: (aspectRatio: number) => ({
		width: `calc(${VIEWER_MAX_HEIGHT} * ${aspectRatio})`,
	}),
})

type PreviewProps = ParentProps<{
	alt?: string
	styles?: StyleXStyles
}>

export function Preview(props: PreviewProps) {
	const { t } = useLingui()
	const { originalSrc } = assertContext(ImageContext, "ImageContext")
	const [aspectRatio, setAspectRatio] = createSignal(1)

	return (
		<kDialog.Root>
			{props.children}
			<kDialog.Portal>
				<Dialog.Overlay />
				<kDialog.Content
					aria-label={t`Enlarged image`}
					{...stylex.attrs(previewStyles.content, props.styles)}
				>
					<img
						src={originalSrc()}
						alt={props.alt ?? ""}
						onLoad={(event) =>
							setAspectRatio(
								event.currentTarget.naturalWidth
									/ event.currentTarget.naturalHeight,
							)
						}
						{...stylex.attrs(
							previewStyles.image,
							previewStyles.imageSize(aspectRatio()),
						)}
					/>
				</kDialog.Content>
			</kDialog.Portal>
		</kDialog.Root>
	)
}
