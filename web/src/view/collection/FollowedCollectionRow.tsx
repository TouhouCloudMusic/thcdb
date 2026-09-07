import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"

import { Avatar } from "~/component/atomic/avatar"
import type { UserCollection } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	avatarFallback: { fontSize: fontSizes.xs, lineHeight: 1 },
	link: {
		display: "grid",
		gap: px[12],
		paddingLeft: { default: px[4], "@media (min-width: 40rem)": px[12] },
		paddingRight: {
			default: px[4],
			"@media (min-width: 40rem)": px[12],
		},
		paddingTop: px[16],
		paddingBottom: px[16],
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
		outlineStyle: "none",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 40rem)": "minmax(0,1fr) auto",
		},
		alignItems: { default: null, "@media (min-width: 40rem)": "center" },
	},
	summary: { minWidth: 0 },
	heading: {
		display: "flex",
		minWidth: 0,
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: px[12],
		rowGap: px[4],
	},
	title: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: "15px",
		fontWeight: 500,
		color: palette.slate[900],
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
	owner: {
		display: "inline-flex",
		minWidth: 0,
		alignItems: "center",
		gap: px[6],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: palette.slate[600],
	},
	avatar: { width: px[16], height: px[16], flexShrink: 0 },
	ownerName: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	description: {
		marginTop: px[4],
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 1,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	metadata: {
		display: "flex",
		alignItems: "center",
		gap: px[16],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
		justifyContent: { default: null, "@media (min-width: 40rem)": "flex-end" },
	},
	count: { fontVariantNumeric: "tabular-nums" },
	arrow: {
		color: {
			default: palette.slate[300],
			"@media (hover: hover)": {
				default: null,
				[stylex.when.ancestor(":hover")]: palette.slate[500],
			},
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
})

export function FollowedCollectionRow(props: {
	item: UserCollection
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	return (
		<li {...stylex.attrs(props.styles)}>
			<Link
				to="/collection/$id"
				params={{ id: props.item.id.toString() }}
				class={
					stylex.attrs(link.base, stylex.defaultMarker(), styles.link).class
				}
			>
				<div {...stylex.attrs(styles.summary)}>
					<div {...stylex.attrs(styles.heading)}>
						<h3 {...stylex.attrs(styles.title)}>{props.item.name}</h3>
						<span {...stylex.attrs(styles.owner)}>
							<Avatar
								user={{
									name: props.item.owner.name,
									avatar_url: props.item.owner.avatar_url,
								}}
								styles={styles.avatar}
								fallbackStyles={styles.avatarFallback}
							/>
							<span {...stylex.attrs(styles.ownerName)}>
								{props.item.owner.name}
							</span>
						</span>
					</div>
					<p {...stylex.attrs(styles.description)}>
						{props.item.description || t`No description`}
					</p>
				</div>

				<div {...stylex.attrs(styles.metadata)}>
					<span {...stylex.attrs(styles.count)}>
						{props.item.item_count}{" "}
						{props.item.item_count === 1 ? t`item` : t`items`}
					</span>
					<span {...stylex.attrs(styles.arrow)}>&gt;</span>
				</div>
			</Link>
		</li>
	)
}
