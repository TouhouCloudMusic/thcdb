import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"

import type { UserCollection } from "~/hey-api"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
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
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		columnGap: px[12],
		rowGap: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	owner: { color: colors.textSecondary, textDecorationLine: "none" },
	description: {
		marginTop: px[4],
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

export function CollectionListItem(props: { collection: UserCollection }) {
	const { t } = useLingui()

	return (
		<div>
			<Link
				to="/collection/$id"
				params={{ id: props.collection.id.toString() }}
				class={stylex.attrs(link.base, link.text, styles.name).class}
			>
				{props.collection.name}
			</Link>

			<div {...stylex.attrs(styles.metadata)}>
				<Link
					to="/profile/$username"
					params={{ username: props.collection.owner.name }}
					class={stylex.attrs(link.base, link.text, styles.owner).class}
				>
					{props.collection.owner.name}
				</Link>
				<span>
					{props.collection.item_count}{" "}
					{props.collection.item_count === 1 ? t`item` : t`items`}
				</span>
			</div>

			<Show when={props.collection.description}>
				{(description) => (
					<p {...stylex.attrs(styles.description)}>{description()}</p>
				)}
			</Show>
		</div>
	)
}
