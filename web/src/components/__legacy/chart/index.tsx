import type { Accessor, JSX } from "solid-js"
import { createMemo, For, Show, splitProps } from "solid-js"
import { PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import type { Props as CardProps } from "../common/Card"
import { Card } from "../common/Card"
import { Input } from "../common/Input"
import { Button } from "../common/button"

export type FilterTag = {
	id: number
	name: string
}

export type TagGroups = FilterTag[][]
export type Props = {
	pos_tags: TagGroups
	neg_tags: TagGroups
} & CardProps

export function ChartFilter(props: Props): JSX.Element {
	const CLASS = "w-72 text-secondary text-sm grid grid-cols-[auto_1fr]"
	// @tw
	const UL_CLASS = "grid grid-cols-subgrid items-baseline col-span-2"
	const DELIMITER = "OR"

	let [_, card_props] = splitProps(props, ["pos_tags", "neg_tags", "class"])
	let cls = createMemo(() => twMerge(CLASS, props.class))

	return (
		<Card
			{...card_props}
			class={cls()}
		>
			<ul class={UL_CLASS}>
				<span>Positive: </span>
				<TagGroups
					data={props.pos_tags}
					delimiter={DELIMITER}
				>
					{(tag_group) => (
						<For each={tag_group}>
							{(tag) => <PositiveTag>{tag.name}</PositiveTag>}
						</For>
					)}
				</TagGroups>
			</ul>
			<ul class={UL_CLASS}>
				<span>Negative: </span>
				<TagGroups
					data={props.neg_tags}
					delimiter={DELIMITER}
				>
					{(tag_group) => (
						<For each={tag_group}>
							{(tag) => <NegativeTag>{tag.name}</NegativeTag>}
						</For>
					)}
				</TagGroups>
			</ul>
			<Input class="col-span-full border-none bg-secondary" />
		</Card>
	)
}

function TagGroups(props: {
	data: TagGroups
	delimiter: string
	children: (item: FilterTag[], index: Accessor<number>) => JSX.Element
}) {
	return (
		<li class="">
			<For each={props.data}>
				{(item, index) => (
					<>
						<ul class="my-1 flex align-baseline">
							{props.children(item, index)}
							<Button
								variant="Tertiary"
								size="Xs"
							>
								<PlusIcon class="size-4" />
							</Button>
						</ul>
						<Show when={index() < props.data.length - 1}>
							<span>{props.delimiter}</span>
						</Show>
					</>
				)}
			</For>
		</li>
	)
}

const TAG_CLASS = "px-1.5 py-1 rounded-md w-fit inline-block mx-0.5"

function PositiveTag(props: JSX.LiHTMLAttributes<HTMLLIElement>) {
	const CLASS = `${TAG_CLASS} bg-green-100 text-green-800 `
	return <li class={CLASS}>{props.children}</li>
}

function NegativeTag(props: JSX.LiHTMLAttributes<HTMLLIElement>) {
	const CLASS = `${TAG_CLASS} bg-reimu-200 text-reimu-700`
	return <li class={CLASS}>{props.children}</li>
}
