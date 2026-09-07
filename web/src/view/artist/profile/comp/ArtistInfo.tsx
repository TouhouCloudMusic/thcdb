/* @refresh skip */
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Artist } from "@thc/api"
import { createMemo, For, Show } from "solid-js"

import { ExternalLinks } from "~/component/data/ExternalLinks"
import { DateWithPrecision } from "~/domain/shared"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"
import { EntityTags } from "~/view/entity_tags/EntityTags"

import { ArtistContext } from ".."

const styles = stylex.create({
	column: {
		display: "flex",
		flexDirection: "column",
	},
	name: {
		overflowWrap: "break-word",
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		fontWeight: 600,
	},
	details: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		marginTop: px[16],
	},
	links: { overflowWrap: "anywhere" },
	aliases: {
		display: "flex",
		flexWrap: "wrap",
		gap: px[4],
	},
	date: {
		color: palette.slate[900],
	},
	subtitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	description: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

export function ArtistInfo() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)
	return (
		<div {...stylex.attrs(styles.column)}>
			<h1 {...stylex.attrs(styles.name)}>{context.artist.name}</h1>
			<div {...stylex.attrs(styles.details)}>
				<Show when={context.artist.artist_type !== "Unknown"}>
					<DateInfo
						value={context.artist.start_date}
						label={context.artist.artist_type == "Solo" ? t`Born` : t`Formed`}
					/>
					<DateInfo
						value={context.artist.end_date}
						label={
							context.artist.artist_type == "Solo" ? t`Died` : t`Disbanded`
						}
					/>
				</Show>
				<Location location={context.artist.start_location} />
				<Location location={context.artist.current_location} />
				<Aliases />
				<Membership />
				<ExternalLinks
					links={context.artist.links}
					linkStyles={styles.links}
				/>
				<EntityTags
					entityType="artist"
					entityId={context.artist.id}
				/>
			</div>
		</div>
	)
}

function Aliases() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)
	const aliases = createMemo(() => getInfoAliases(context.artist))
	return (
		<Show when={aliases().length > 0}>
			<div>
				<span {...stylex.attrs(styles.description)}>{t`Aliases`}</span>
				<ul {...stylex.attrs(styles.aliases)}>
					<For each={aliases()}>
						{(alias, index) => (
							<>
								<li>
									<Show
										when={alias.id}
										fallback={alias.name}
									>
										{alias.id}
									</Show>
									<Show when={aliases().length - 1 > index()}>{", "}</Show>
								</li>
							</>
						)}
					</For>
				</ul>
			</div>
		</Show>
	)
}

function DateInfo(props: { value?: Artist["start_date"]; label: string }) {
	const parsedDate = createMemo(() => {
		if (!props.value) {
			return
		}

		return DateWithPrecision.display(props.value)
	})
	return (
		<Show when={props.value}>
			<div {...stylex.attrs(styles.column)}>
				<span {...stylex.attrs(styles.description)}>{props.label}</span>
				<span {...stylex.attrs(styles.date)}>{parsedDate()}</span>
			</div>
		</Show>
	)
}

function Membership() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)
	const label = createMemo(() => {
		if (context.artist.artist_type === "Solo") {
			return t`Member Of`
		} else if (context.artist.artist_type === "Multiple") {
			return t`Members`
		}
	})
	return (
		<Show
			when={
				context.artist.artist_type !== "Unknown"
				&& context.artist.memberships?.length
			}
		>
			<div>
				<span {...stylex.attrs(styles.subtitle)}>{label()}</span>
				<ul>
					<For each={context.artist.memberships}>
						{(membership) => <li>{membership.artist_id}</li>}
					</For>
				</ul>
			</div>
		</Show>
	)
}

function Location(props: { location?: Artist["start_location"] }) {
	return (
		<Show when={props.location?.country}>
			<div>
				{props.location!.country}
				{props.location!.province && <>, {props.location!.province}</>}
				{props.location!.city && <>, {props.location!.city}</>}
			</div>
		</Show>
	)
}

// Data utils

type InfoAlias = {
	id?: number
	name?: string
}

function getInfoAliases(artist: Artist): InfoAlias[] {
	const arr: InfoAlias[] = []

	if (artist.aliases) {
		for (const aliasId of artist.aliases) {
			arr.push({
				id: aliasId,
			})
		}
	}

	if (artist.text_aliases) {
		for (const alias of artist.text_aliases) {
			arr.push({
				name: alias,
			})
		}
	}

	return arr
}
