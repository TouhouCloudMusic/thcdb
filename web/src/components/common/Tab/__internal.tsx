import type { PolymorphicProps } from "@kobalte/core"
import * as K_Tab from "@kobalte/core/tabs"
import { createContext, mergeProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Button } from "~/components/button"
import { assertContext } from "~/utils/context"

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

export function Trigger(
	props: PolymorphicProps<typeof Button, K_Tab.TabsTriggerProps<typeof Button>>,
) {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(
				"p-0 duration-100 hover:bg-slate-50 active:bg-slate-200/50 rounded-none",
				props.class,
			)
		},
	})

	return (
		<K_Tab.Trigger
			as={Button}
			variant="Tertiary"
			{...finalProps}
		/>
	)
}

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
					(!props.position && context.orientation == "horizontal") ||
					props.position === "bottom"
				) {
					return "bottom-[-1px] h-[2px]"
				}
				if (
					(!props.position && context.orientation == "vertical") ||
					props.position === "right"
				) {
					return "right-[-1px] w-[2px]"
				}
				if (props.position === "top") {
					return "top-[-1px] h-[2px]"
				}
				if (props.position === "left") {
					return "left-[-1px] w-[2px]"
				}

				return ""
			}

			return twMerge(
				positionClass(),
				"absolute bg-reimu-600 duration-150",
				props.class,
			)
		},
	})
	return <K_Tab.Indicator {...finalProps} />
}
