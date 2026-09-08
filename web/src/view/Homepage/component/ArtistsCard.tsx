import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For, Show } from "solid-js"

import type { ArtistListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { surfaceStyles } from "~/style/primitives"
import { radius, px } from "~/style/tokens.stylex"
import { ArtistCard } from "~/view/Homepage/component/ArtistCard"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { ARTISTS_LIMIT } from "~/view/Homepage/constants"

import { animationNames } from "../../../style/animations.stylex"

const styles = stylex.create({
	grid: {
		display: "grid",
		gridTemplateColumns:
			"repeat(auto-fit,minmax(min(100%,max(8.75rem,25%)),1fr))",
		gap: px[2],
	},
	skeleton: {
		display: "flex",
		flexDirection: "column",
		borderRadius: 0,
		padding: px[12],
		boxShadow: "none",
		animationName: {
			default: animationNames.pulse,
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		animationDuration: "2s",
		animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
		animationIterationCount: "infinite",
	},
	avatar: {
		aspectRatio: "1",
		width: "100%",
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
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
		height: px[14],
		width: "80%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	country: {
		height: px[12],
		width: "40%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	empty: { height: px[144] },
})

function ArtistTileSkeleton() {
	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.skeleton)}>
			<div {...stylex.attrs(styles.avatar)}></div>

			<div {...stylex.attrs(styles.content)}>
				<div {...stylex.attrs(styles.name)}></div>
				<div {...stylex.attrs(styles.country)}></div>
			</div>
		</div>
	)
}

function ArtistsGridSkeleton() {
	return (
		<div {...stylex.attrs(styles.grid)}>
			<For each={Array.from({ length: ARTISTS_LIMIT })}>
				{() => <ArtistTileSkeleton />}
			</For>
		</div>
	)
}

function ArtistsGrid(props: { artists: ArtistListItem[] }) {
	return (
		<Show
			when={props.artists.length > 0}
			fallback={<HomeEmptySlot styles={styles.empty} />}
		>
			<div {...stylex.attrs(styles.grid)}>
				<For each={props.artists}>
					{(artist) => <ArtistCard artist={artist} />}
				</For>
			</div>
		</Show>
	)
}

export function ArtistsCardSkeleton() {
	const { t } = useLingui()
	return (
		<ExploreSection
			title={t`Popular Artists`}
			to="/artist/explore"
		>
			<ArtistsGridSkeleton />
		</ExploreSection>
	)
}

export function ArtistsCard(props: { artists: ArtistListItem[] }) {
	const { t } = useLingui()
	return (
		<ExploreSection
			title={t`Popular Artists`}
			to="/artist/explore"
		>
			<ArtistsGrid artists={props.artists} />
		</ExploreSection>
	)
}
