import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import type { ArtistListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

import { ArtistTypeLabel } from "./ArtistTypeLabel"

const styles = stylex.create({
	resultRow: {
		display: "grid",
		gridTemplateColumns: "3lh minmax(0,1fr)",
		alignItems: "flex-start",
		gap: px[12],
		lineHeight: "1.5rem",
	},
	thumbnail: {
		position: "relative",
		aspectRatio: "1 / 1",
		overflow: "hidden",
		borderRadius: radius.full,
		textDecorationLine: "none",
		boxShadow: {
			default: null,
			":focus-visible": "0 0 0 2px currentcolor",
		},
	},
	image: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	summary: {
		display: "flex",
		flexDirection: "column",
		justifyContent: "space-between",
		gap: px[8],
		alignSelf: "stretch",
	},
	heading: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		columnGap: px[8],
		rowGap: px[4],
	},
	name: {
		overflowWrap: "break-word",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
		textDecorationColor: palette.slate[300],
		textUnderlineOffset: "2px",
	},
	description: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

export function ArtistItem(props: { artist: ArtistListItem }) {
	const location = () =>
		[
			props.artist.current_location.city,
			props.artist.current_location.province,
			props.artist.current_location.country,
		]
			.filter(Boolean)
			.join(", ")

	return (
		<div {...stylex.attrs(styles.resultRow)}>
			<Thumbnail
				src={imgUrl(props.artist.profile_image_url)}
				to="/artist/$id"
				params={{ id: props.artist.id.toString() }}
				aria-label={props.artist.name}
				styles={[styles.thumbnail]}
				imageStyles={[styles.image]}
			/>

			<div {...stylex.attrs(styles.summary)}>
				<div {...stylex.attrs(styles.heading)}>
					<Link
						to="/artist/$id"
						params={{ id: props.artist.id.toString() }}
						class={stylex.attrs(link.base, link.text, styles.name).class}
					>
						{props.artist.name}
					</Link>
					<span {...stylex.attrs(styles.description)}>
						<ArtistTypeLabel value={props.artist.artist_type} />
					</span>
				</div>
				<Show when={location()}>
					{(value) => (
						<div {...stylex.attrs(styles.description)}>{value()}</div>
					)}
				</Show>
			</div>
		</div>
	)
}
