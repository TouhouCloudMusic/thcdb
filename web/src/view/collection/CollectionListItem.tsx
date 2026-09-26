import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import type { JSX } from "solid-js"

import { link } from "~/style/link"
import { listItemStyles } from "~/style/primitives"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: { minWidth: 0 },
	name: {
		display: "block",
		overflowWrap: "break-word",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	metadata: {
		alignItems: "baseline",
		columnGap: px[12],
		rowGap: px[4],
		lineHeight: lineHeights.sm,
	},
	owner: { color: colors.textSecondary, textDecorationLine: "none" },
	description: {
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

function Root(props: { children: JSX.Element; styles?: StyleXStyles }) {
	return (
		<div {...stylex.attrs(styles.root, props.styles)}>{props.children}</div>
	)
}

function Name(props: {
	id: number
	children: JSX.Element
	styles?: StyleXStyles
}) {
	return (
		<Link
			to="/collection/$id"
			params={{ id: props.id.toString() }}
			class={
				stylex.attrs(link.base, link.withUnderline, styles.name, props.styles)
					.class
			}
		>
			{props.children}
		</Link>
	)
}

function Owner(props: { name: string; styles?: StyleXStyles }) {
	return (
		<Link
			to="/profile/$username"
			params={{ username: props.name }}
			class={
				stylex.attrs(link.base, link.withUnderline, styles.owner, props.styles)
					.class
			}
		>
			{props.name}
		</Link>
	)
}

function ItemCount(props: { value: number; styles?: StyleXStyles }) {
	const { t } = useLingui()
	return (
		<span {...stylex.attrs(props.styles)}>
			{props.value} {props.value === 1 ? t`item` : t`items`}
		</span>
	)
}

function Metadata(props: { children: JSX.Element; styles?: StyleXStyles }) {
	return (
		<div
			{...stylex.attrs(listItemStyles.metadata, styles.metadata, props.styles)}
		>
			{props.children}
		</div>
	)
}

function Description(props: {
	children?: string | null
	styles?: StyleXStyles
}) {
	return (
		<Show when={props.children}>
			{(description) => (
				<p {...stylex.attrs(styles.description, props.styles)}>
					{description()}
				</p>
			)}
		</Show>
	)
}

export const CollectionListItem = {
	Root,
	Name,
	Owner,
	ItemCount,
	Metadata,
	Description,
}
