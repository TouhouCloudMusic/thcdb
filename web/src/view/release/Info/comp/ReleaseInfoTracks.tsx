import { Trans } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createMemo, For, Show } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { Duration } from "~/domain/shared"
import type { Release, ReleaseArtist, ReleaseTrack } from "~/hey-api"
import { link } from "~/style/link"
import { dividerStyles, infoStyles } from "~/style/primitives"
import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	track: {
		gridColumn: "1 / -1",
		display: "grid",
		gridTemplateColumns: "subgrid",
		alignItems: "first baseline",
	},
	numericMetadata: {
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		fontVariantNumeric: "tabular-nums",
		color: colors.textTertiary,
	},
	trackNumber: { textAlign: "right" },
	information: {
		display: "flex",
		flexDirection: "column",
		gap: px[4],
		overflowWrap: "anywhere",
	},
	titleRow: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		columnGap: px[8],
	},
	creditsList: {
		display: "flex",
		flexDirection: "column",
		gap: px[2],
	},
	duration: { whiteSpace: "nowrap" },
	tracks: {
		display: "grid",
		gridTemplateColumns: "auto minmax(0,1fr) auto",
		columnGap: px[16],
		rowGap: px[8],
	},
	divider: { gridColumn: "1 / -1" },
	discs: { display: "flex", flexDirection: "column", gap: px[24] },
	disc: { display: "flex", flexDirection: "column", gap: px[12] },
	discTitle: {
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
		overflowWrap: "anywhere",
	},
	emptyMessage: {
		display: "flex",
		minHeight: px[256],
		alignItems: "center",
		justifyContent: "center",
		paddingInline: px[16],
		paddingBlock: px[24],
		textAlign: "center",
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		color: colors.textSecondary,
	},
})

type ReleaseCredit = NonNullable<Release["credits"]>[number]
type IndexedTrack = { track: ReleaseTrack; index: number }

function TrackItem(props: {
	track: ReleaseTrack
	index: number
	credits?: ReleaseCredit[] | null
}) {
	const credits = createMemo(() => {
		const grouped = new Map<
			number,
			{ artist: ReleaseCredit["artist"]; roles: ReleaseCredit["role"][] }
		>()
		for (const credit of props.credits ?? []) {
			if (!credit.on?.includes(props.index)) continue

			const group = grouped.get(credit.artist.id)
			if (group) {
				group.roles.push(credit.role)
			} else {
				grouped.set(credit.artist.id, {
					artist: credit.artist,
					roles: [credit.role],
				})
			}
		}
		return [...grouped.values()]
	})

	return (
		<li {...stylex.attrs(styles.track)}>
			<span {...stylex.attrs(styles.numericMetadata, styles.trackNumber)}>
				{props.track.track_number}
			</span>
			<div {...stylex.attrs(styles.information)}>
				<div {...stylex.attrs(styles.titleRow)}>
					<Link
						class={
							stylex.attrs(link.base, link.withUnderline, infoStyles.detail)
								.class
						}
						to="/song/$id"
						params={{ id: props.track.song.id.toString() }}
					>
						{props.track.display_title ?? props.track.song.title}
					</Link>
					<Show when={props.track.artists && props.track.artists.length > 0}>
						<div {...stylex.attrs(infoStyles.label)}>
							{props.track
								.artists!.map((artist: ReleaseArtist) => artist.name)
								.join(", ")}
						</div>
					</Show>
				</div>
				<Show when={credits().length > 0}>
					<ul {...stylex.attrs(infoStyles.label, styles.creditsList)}>
						<For each={credits()}>
							{(credit) => (
								<li>
									<Link
										class={
											stylex.attrs(
												link.base,
												link.withUnderline,
												infoStyles.detail,
											).class
										}
										to="/artist/$id"
										params={{ id: credit.artist.id.toString() }}
									>
										{credit.artist.name}
									</Link>{" "}
									<span>
										{credit.roles.map((role) => role.name).join(", ")}
									</span>
								</li>
							)}
						</For>
					</ul>
				</Show>
			</div>
			<Show
				when={props.track.duration}
				fallback={<span></span>}
			>
				<span {...stylex.attrs(styles.numericMetadata, styles.duration)}>
					{Duration.format(props.track.duration)}
				</span>
			</Show>
		</li>
	)
}
function TrackList(props: {
	tracks?: IndexedTrack[]
	credits?: ReleaseCredit[] | null
}) {
	return (
		<Show when={props.tracks}>
			<ul {...stylex.attrs(styles.tracks)}>
				<Intersperse
					of={props.tracks}
					with={
						<span
							{...stylex.attrs(dividerStyles.horizontal, styles.divider)}
						></span>
					}
				>
					{(item) => (
						<TrackItem
							track={item.track}
							index={item.index}
							credits={props.credits}
						/>
					)}
				</Intersperse>
			</ul>
		</Show>
	)
}

type ReleaseInfoTracksProps = {
	discs?: Release["discs"] | null
	tracks?: ReleaseTrack[] | null
	credits?: Release["credits"] | null
}

export function ReleaseInfoTracks(props: ReleaseInfoTracksProps) {
	const tracks = createMemo(() =>
		props.tracks?.map((track, index) => ({ track, index })),
	)

	return (
		<Show
			when={(props.tracks?.length ?? 0) > 0}
			fallback={
				<p {...stylex.attrs(styles.emptyMessage)}>
					<Trans>No tracks yet</Trans>
				</p>
			}
		>
			<Show
				when={
					(props.discs?.length ?? 0) > 1
					|| props.discs?.some((disc) => Boolean(disc.name))
				}
				fallback={
					<TrackList
						tracks={tracks()}
						credits={props.credits}
					/>
				}
			>
				<div {...stylex.attrs(styles.discs)}>
					<For each={props.discs}>
						{(disc, index) => (
							<div {...stylex.attrs(styles.disc)}>
								<h4 {...stylex.attrs(styles.discTitle)}>
									{disc.name ?? `Disc ${index() + 1}`}
								</h4>
								<TrackList
									tracks={tracks()?.filter(
										(item) => item.track.disc_id === disc.id,
									)}
									credits={props.credits}
								/>
							</div>
						)}
					</For>
				</div>
			</Show>
		</Show>
	)
}
