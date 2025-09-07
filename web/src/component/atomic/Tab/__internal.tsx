import type { PolymorphicProps } from "@kobalte/core"
import * as K_Tab from "@kobalte/core/tabs"
import { createContext, mergeProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"
import { assertContext } from "~/utils/solid/assertContext"

export type RootProps = PolymorphicProps<"div", K_Tab.TabsRootProps<"div">> & {
	orientation?: "horizontal" | "vertical"
}

type IndicatorPosition = "bottom" | "top" | "left" | "right"

type Context =
	| {
			orientation: "horizontal"
	  }
	| {
			orientation: "vertical"
	  }
const Context = createContext<Context>()

export function Root(props: RootProps) {
	return (
		<Context.Provider
			value={
				{
					get orientation() {
						return props.orientation ?? "horizontal"
					},
				} as Context
			}
		>
			<K_Tab.Root {...props} />
		</Context.Provider>
	)
}

export function List(props: PolymorphicProps<"ul", K_Tab.TabsListProps<"ul">>) {
	const context = assertContext(Context)
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(
				"relative flex",
				context.orientation == "horizontal" ? "" : "flex-col",
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
	text-sm font-medium tracking-widest text-tertiary uppercase
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

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function Content<T>(
	props: PolymorphicProps<"div", K_Tab.TabsContentProps<"div">> & { value: T },
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
	const context = assertContext(Context)
	const finalProps = mergeProps(props, {
		get class() {
			const positionClass = () => {
				if (
					(!props.position && context.orientation == "horizontal")
					|| props.position === "bottom"
				) {
					return "bottom-[-0.5px] h-[2px]"
				}
				if (
					(!props.position && context.orientation == "vertical")
					|| props.position === "right"
				) {
					return "right-[-0.5px] w-[2px]"
				}
				if (props.position === "top") {
					return "top-[-0.5px] h-[2px]"
				}
				if (props.position === "left") {
					return "left-[-0.5px] w-[2px]"
				}

				return ""
			}

			return twMerge(
				positionClass(),
				"absolute bg-reimu-600 duration-150 rounded-full",
				props.class,
			)
		},
	})
	return <K_Tab.Indicator {...finalProps} />
}
