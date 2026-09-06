import type { PolymorphicProps } from "@kobalte/core"
import * as K_Tab from "@kobalte/core/tabs"
import type { ParentProps } from "solid-js"
import { mergeProps, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"
import { createHorizontalFocusScroll } from "~/utils/solid/createHorizontalFocusScroll"
import { createScrollEdges } from "~/utils/solid/createScrollEdges"

export type RootProps = PolymorphicProps<"div", K_Tab.TabsRootProps<"div">>

export const CONTAINER_CLASS = "border-b border-slate-300"

type IndicatorPosition = "bottom" | "top" | "left" | "right"

export function Root(props: RootProps) {
	return <K_Tab.Root {...props} />
}

export function ScrollArea(props: ParentProps) {
	let viewport!: HTMLDivElement
	let content!: HTMLDivElement
	const focusedTabScroll = createHorizontalFocusScroll(() => viewport)
	const { canScrollLeft, canScrollRight } = createScrollEdges(
		() => viewport,
		() => content,
	)

	return (
		<div class="relative min-w-0">
			<div
				ref={(element) => {
					viewport = element
				}}
				class="overflow-x-auto scroll-smooth motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				onWheel={focusedTabScroll.cancel}
				onFocusIn={focusedTabScroll.reveal}
				onPointerDown={focusedTabScroll.cancel}
			>
				<div
					ref={(element) => {
						content = element
					}}
					class="w-max min-w-full"
				>
					{props.children}
				</div>
			</div>
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-y-0 left-0 w-3 border-l border-reimu-600"
				style={{
					opacity: canScrollLeft() ? 1 : 0,
				}}
			>
				<div class="absolute inset-0 inset-shadow-[6px_0_12px_-6px_rgb(0_0_0_/_8%)] [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
			</div>
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-y-0 right-0 w-3 border-r border-reimu-600"
				style={{
					opacity: canScrollRight() ? 1 : 0,
				}}
			>
				<div class="absolute inset-0 inset-shadow-[-6px_0_12px_-6px_rgb(0_0_0_/_8%)] [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
			</div>
		</div>
	)
}

export function List(props: PolymorphicProps<"ul", K_Tab.TabsListProps<"ul">>) {
	const tabs = K_Tab.useTabsContext()
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(
				"relative flex",
				tabs.orientation() === "horizontal"
					? "gap-x-2 whitespace-nowrap [&>*]:shrink-0"
					: "flex-col",
				props.class,
			)
		},
	})
	return (
		<K_Tab.List
			as="ul"
			{...finalProps}
		/>
	)
}

const TRIGGER_CLASS = tw(
	`
	px-2 rounded-none
	text-sm font-light tracking-wide text-tertiary uppercase
	transition-all duration-150
	hover:text-primary
	data-[selected]:text-primary`,
)

export function Trigger(
	props: PolymorphicProps<"button", K_Tab.TabsTriggerProps<"button">>,
) {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(TRIGGER_CLASS, props.class)
		},
	})

	return (
		<K_Tab.Trigger
			as="button"
			// variant="Tertiary"
			{...finalProps}
		/>
	)
}

export function Content(
	props: PolymorphicProps<"div", K_Tab.TabsContentProps<"div">>,
) {
	return <K_Tab.Content {...props} />
}

export type IndicatorProps = PolymorphicProps<
	"div",
	K_Tab.TabsIndicatorProps<"div">
> & {
	position?: IndicatorPosition
}

export function Indicator(props: IndicatorProps) {
	const tabs = K_Tab.useTabsContext()
	const [local, others] = splitProps(props, ["class", "position"])
	const position = () =>
		local.position ?? (tabs.orientation() === "horizontal" ? "bottom" : "right")

	return (
		<K_Tab.Indicator
			{...others}
			class={twMerge(
				"pointer-events-none absolute rounded-full bg-reimu-600 transition-all duration-150 ease-in-out data-[resizing=true]:transition-none motion-reduce:transition-none",
				position() === "bottom" && "-bottom-px h-0.5",
				position() === "top" && "top-0 h-0.5",
				position() === "left" && "left-0 w-0.5",
				position() === "right" && "right-0 w-0.5",
				local.class,
			)}
		/>
	)
}
