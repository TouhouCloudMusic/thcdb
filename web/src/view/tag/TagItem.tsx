import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { StackIcon } from "@thc/icons/radix"
import { For, Show } from "solid-js"

import type { TagListItem } from "~/hey-api"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	heading: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		columnGap: px[4],
		rowGap: px[4],
	},
	name: {
		overflowWrap: "break-word",
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	parents: {
		display: "flex",
		minWidth: 0,
		alignItems: "baseline",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	parentIcon: {
		display: "flex",
		aspectRatio: "1 / 1",
		height: "1lh",
		flexShrink: 0,
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "flex-start",
	},
	parentNames: { minWidth: 0, overflowWrap: "break-word" },
	parentLink: {
		color: colors.textTertiary,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	description: {
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

export function TagItem(props: { tag: TagListItem }) {
	return (
		<div>
			<div {...stylex.attrs(styles.heading)}>
				<Link
					to="/tag/$id"
					params={{ id: props.tag.id.toString() }}
					class={stylex.attrs(link.base, link.text, styles.name).class}
				>
					{props.tag.name}
				</Link>
				<Show when={props.tag.parents.length > 0}>
					<div {...stylex.attrs(styles.parents)}>
						<span {...stylex.attrs(styles.parentIcon)}>
							<StackIcon aria-hidden="true" />
						</span>
						<div {...stylex.attrs(styles.parentNames)}>
							<For each={props.tag.parents}>
								{(parent, index) => (
									<>
										<Link
											to="/tag/$id"
											params={{ id: parent.id.toString() }}
											class={
												stylex.attrs(link.base, link.text, styles.parentLink)
													.class
											}
										>
											{parent.name}
										</Link>
										<Show when={index() < props.tag.parents.length - 1}>
											{" / "}
										</Show>
									</>
								)}
							</For>
						</div>
					</div>
				</Show>
			</div>

			<Show when={props.tag.short_description}>
				{(description) => (
					<p {...stylex.attrs(styles.description)}>{description()}</p>
				)}
			</Show>
		</div>
	)
}
