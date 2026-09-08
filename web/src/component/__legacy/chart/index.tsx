import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { PlusIcon } from "@thc/icons/radix"
import type { Accessor, JSX, ComponentProps } from "solid-js"
import { For, Show, splitProps } from "solid-js"

import { inputStyles } from "~/component/atomic/Input"
import { Button } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { surfaceStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	size,
} from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		width: size[288],
		color: colors.textSecondary,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		display: "grid",
		gridTemplateColumns: "auto 1fr",
	},
	list: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		alignItems: "baseline",
		gridColumn: "span 2 / span 2",
	},
	input: {
		gridColumn: "1 / -1",
		borderStyle: "none",
		backgroundColor: colors.backgroundSecondary,
	},
	group: { marginBlock: size[4], display: "flex" },
	icon: { width: size[16], height: size[16] },
	tag: {
		paddingInline: size[6],
		paddingBlock: size[4],
		borderRadius: radius.md,
		width: "fit-content",
		display: "inline-block",
		marginInline: size[2],
	},
	positive: { backgroundColor: palette.green[100], color: palette.green[800] },
	negative: { backgroundColor: palette.reimu[200], color: palette.reimu[700] },
})

export type FilterTag = {
	id: number
	name: string
}

export type TagGroups = FilterTag[][]
export type Props = {
	pos_tags: TagGroups
	neg_tags: TagGroups
} & Omit<ComponentProps<"div">, "class"> & { styles?: StyleXStyles }

export function ChartFilter(props: Props): JSX.Element {
	const { t } = useLingui()
	const DELIMITER = t`OR`

	const [_, card_props] = splitProps(props, ["pos_tags", "neg_tags", "styles"])

	return (
		<div
			{...card_props}
			{...stylex.attrs(surfaceStyles.card, styles.root, props.styles)}
		>
			<ul {...stylex.attrs(styles.list)}>
				<span>{t`Positive:`} </span>
				<TagGroups
					data={props.pos_tags}
					delimiter={DELIMITER}
				>
					{(tag_group) => (
						<For each={tag_group}>
							{(tag) => (
								<li {...stylex.attrs(styles.tag, styles.positive)}>
									{tag.name}
								</li>
							)}
						</For>
					)}
				</TagGroups>
			</ul>
			<ul {...stylex.attrs(styles.list)}>
				<span>{t`Negative:`} </span>
				<TagGroups
					data={props.neg_tags}
					delimiter={DELIMITER}
				>
					{(tag_group) => (
						<For each={tag_group}>
							{(tag) => (
								<li {...stylex.attrs(styles.tag, styles.negative)}>
									{tag.name}
								</li>
							)}
						</For>
					)}
				</TagGroups>
			</ul>
			<input
				{...stylex.attrs(inputStyles.like, inputStyles.input, styles.input)}
			/>
		</div>
	)
}

function TagGroups(props: {
	data: TagGroups
	delimiter: string
	children: (item: FilterTag[], index: Accessor<number>) => JSX.Element
}) {
	return (
		<li>
			<For each={props.data}>
				{(item, index) => (
					<>
						<ul {...stylex.attrs(styles.group)}>
							{props.children(item, index)}
							<Button
								appearance="ghost"
								tone="gray"
								size="xs"
							>
								<PlusIcon {...stylex.attrs(styles.icon)} />
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
