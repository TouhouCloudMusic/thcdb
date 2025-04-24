/* eslint-disable jsx-a11y/alt-text */
import {
	type ComponentProps,
	mergeProps,
	createContext,
	useContext,
	Show,
	createEffect,
	type ParentProps,
} from "solid-js"
import { createStore } from "solid-js/store"
import { Portal } from "solid-js/web"
import { twMerge } from "tailwind-merge"
import { callHandlerUnion } from "~/utils/dom/event"

const enum State {
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
	setSrc: (src: string) => void
	alt?: string
	setAlt: (alt: string) => void
}

const ImageContext = createContext<ImageContext>()

export function Root(props: ParentProps) {
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
		setAlt(alt: string) {
			setStore("alt", alt)
		},
	})

	return (
		<ImageContext.Provider value={store}>
			{props.children}
		</ImageContext.Provider>
	)
}

export type ContainerProps = ComponentProps<"div">

export function Container(props: ContainerProps) {
	const local_props = mergeProps(props, {
		get class() {
			return twMerge("relative h-full w-full", props.class)
		},
	})
	return <div {...local_props}>{props.children}</div>
}

export type ImgProps = ComponentProps<"img">

export function Img(props: ImgProps) {
	const IMAGE_CLASS = "object-cover"
	const context = useContext(ImageContext)!

	createEffect(() => {
		context.setSrc(props.src!)
	})

	createEffect(() => {
		context.setAlt(props.alt!)
	})

	const img_props = mergeProps(props, {
		get class() {
			return twMerge(IMAGE_CLASS, props.class)
		},

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
		<Show when={!context.isError}>
			<img {...img_props} />
		</Show>
	)
}

export function Fallback(props: ParentProps) {
	const context = useContext(ImageContext)!
	return (
		<Show when={context.isLoading}>
			{props.children ?? (
				<div class="flex h-full w-full animate-pulse items-center justify-center bg-gray-200">
					<img
						class="m-auto w-3/4"
						src="/img/cover/release/1.png"
						alt="Loading..."
					/>
				</div>
			)}
		</Show>
	)
}

export function ErrorComponent(props: ParentProps) {
	const context = useContext(ImageContext)!
	return (
		<Show when={context.isError}>
			{props.children ?? (
				<div class="flex h-full w-full items-center justify-center bg-gray-200">
					<span class="text-lg text-gray-500">Image Not Found!</span>
				</div>
			)}
		</Show>
	)
}

export type PreiewProps = {
	class?: string
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
					class={twMerge(
						"bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black",
						props.class,
						// 移除原生 button 样式
						"m-0 cursor-zoom-out appearance-none border-none p-0",
					)}
				>
					<img
						src={context.src}
						alt={context.alt}
						class="max-h-[90%] max-w-[90%] object-contain"
					/>
				</button>
			</Portal>
		</Show>
	)
}
