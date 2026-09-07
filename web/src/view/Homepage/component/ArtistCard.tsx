import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"

import type { ArtistListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

import { artistCard as cardMarker } from "./cardMarkers.stylex"

const styles = stylex.create({
	root: {
		position: "relative",
		display: "flex",
		flexDirection: "column",
		borderRadius: 0,
		padding: px[12],
		boxShadow: "none",
	},
	avatarLink: {
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
	},
	initials: {
		display: "grid",
		aspectRatio: "1",
		width: "100%",
		placeItems: "center",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		fontWeight: 300,
		letterSpacing: 0,
		color: colors.textSecondary,
	},
	avatar: {
		aspectRatio: "1",
		width: "100%",
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
		objectFit: "cover",
	},
	content: {
		display: "flex",
		flex: "1",
		flexDirection: "column",
		justifyContent: "space-between",
		gap: px[4],
		paddingTop: px[8],
	},
	name: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		letterSpacing: 0,
		color: colors.textPrimary,
	},
	country: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 300,
		color: colors.textTertiary,
	},
	overlay: {
		pointerEvents: "none",
		position: "absolute",
		inset: 0,
		backgroundColor: `color-mix(in oklab, ${palette.slate[700]} 5%, transparent)`,
		opacity: {
			default: 0,
			"@media (hover: hover)": {
				[stylex.when.ancestor(":hover", cardMarker)]: 1,
			},
			[stylex.when.ancestor(":focus-within", cardMarker)]: 1,
		},
		transitionProperty: {
			default: "opacity",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
})

type ArtistCardProps = {
	artist: ArtistListItem
}

export function ArtistCard(props: ArtistCardProps) {
	const avatarUrl = () => imgUrl(props.artist.profile_image_url)
	const initials = () => props.artist.name.trim().slice(0, 1).toUpperCase()
	const artistHrefParams = () => ({ id: props.artist.id.toString() })
	const country = () => props.artist.current_location.country

	return (
		<div {...stylex.attrs(cardMarker, surfaceStyles.card, styles.root)}>
			<Link
				to="/artist/$id"
				params={artistHrefParams()}
				class={stylex.attrs(link.base, styles.avatarLink).class}
			>
				<Show
					when={avatarUrl()}
					fallback={<div {...stylex.attrs(styles.initials)}>{initials()}</div>}
				>
					{(src) => (
						<img
							src={src()}
							alt=""
							loading="lazy"
							{...stylex.attrs(styles.avatar)}
						/>
					)}
				</Show>
			</Link>

			<div {...stylex.attrs(styles.content)}>
				<Link
					to="/artist/$id"
					params={artistHrefParams()}
					title={props.artist.name}
					class={stylex.attrs(link.base, link.text, styles.name).class}
				>
					{props.artist.name}
				</Link>
				<Show when={country()}>
					{(value) => <div {...stylex.attrs(styles.country)}>{value()}</div>}
				</Show>
			</div>

			<div
				aria-hidden="true"
				{...stylex.attrs(styles.overlay)}
			></div>
		</div>
	)
}
