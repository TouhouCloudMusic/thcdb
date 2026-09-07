import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import type { LabelListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	item: { minWidth: "0rem" },
	name: {
		overflowWrap: "break-word",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		textDecorationLine: "none",
		textDecorationColor: palette.slate[300],
		textUnderlineOffset: "2px",
	},
	details: {
		marginTop: px[4],
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	releaseLink: { color: colors.textTertiary, textDecorationLine: "none" },
})

export function LabelItem(props: { label: LabelListItem }) {
	const foundedYear = () => props.label.founded_date?.value.slice(0, 4)

	return (
		<div {...stylex.attrs(styles.item)}>
			<Link
				to="/label/$id"
				params={{ id: props.label.id.toString() }}
				class={stylex.attrs(link.base, link.text, styles.name).class}
			>
				{props.label.name}
			</Link>

			<div {...stylex.attrs(styles.details)}>
				<Show when={foundedYear()}>
					{(year) => (
						<>
							<span>{year()}</span>
							<Show when={props.label.founders.length > 0}>{" · "}</Show>
						</>
					)}
				</Show>
				<For each={props.label.founders}>
					{(founder, index) => (
						<>
							<Link
								to="/artist/$id"
								params={{ id: founder.id.toString() }}
								class={
									stylex.attrs(link.base, link.text, styles.releaseLink).class
								}
							>
								{founder.name}
							</Link>
							<Show when={index() < props.label.founders.length - 1}>
								{", "}
							</Show>
						</>
					)}
				</For>
			</div>
		</div>
	)
}
