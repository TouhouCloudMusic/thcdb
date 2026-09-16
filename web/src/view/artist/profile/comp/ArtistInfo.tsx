/* @refresh skip */
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { Artist } from "@thc/api"
import { createMemo, Show } from "solid-js"

import { ExternalLinks } from "~/component/data/ExternalLinks"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { link } from "~/style/link"
import { infoStyles } from "~/style/primitives"
import { fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"
import { ArtistTypeLabel } from "~/view/artist/ArtistTypeLabel"

import { ArtistContext } from ".."

const styles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "1 / -1",
		alignItems: "start",
	},
	name: {
		gridColumn: "1 / -1",
		paddingBlockEnd: px[8],
		overflowWrap: "break-word",
		fontSize: fontSizes.xl,
		lineHeight: px[24],
		fontWeight: 600,
	},
	fields: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "1 / -1",
		rowGap: px[12],
	},
	infoCell: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr)",
		gridTemplateRows: `${px[20]} minmax(${px[24]},auto)`,
		gridColumn: "1 / -1",
		alignItems: "start",
		minWidth: 0,
		lineHeight: px[24],
	},
	infoValue: {
		display: "grid",
		gridTemplateColumns: "auto auto",
		justifyContent: "start",
		columnGap: px[32],
	},
	inlineList: {
		overflowWrap: "anywhere",
		whiteSpace: "pre-wrap",
	},
	inlineListItem: { display: "inline" },
})

export function ArtistInfo() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)

	return (
		<div {...stylex.attrs(styles.root)}>
			<h1 {...stylex.attrs(styles.name)}>{context.artist.name}</h1>
			<div {...stylex.attrs(styles.fields)}>
				<div {...stylex.attrs(styles.infoCell)}>
					<span {...stylex.attrs(infoStyles.label)}>{t`Type`}</span>
					<div {...stylex.attrs(infoStyles.detail)}>
						<ArtistTypeLabel value={context.artist.artist_type} />
					</div>
				</div>
				<StartInfo />
				<Show when={context.artist.artist_type !== "Unknown"}>
					<DateInfo
						value={context.artist.end_date}
						label={
							context.artist.artist_type == "Solo" ? t`Died` : t`Disbanded`
						}
					/>
				</Show>
				<Location
					location={context.artist.current_location}
					label={t`Current location`}
				/>
				<Aliases />
				<Membership />
				<Show when={context.artist.links?.length}>
					<div {...stylex.attrs(styles.infoCell)}>
						<ExternalLinks.Label />
						<ExternalLinks.Body links={context.artist.links} />
					</div>
				</Show>
			</div>
		</div>
	)
}

function StartInfo() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)

	const startLocation = () => {
		const value = context.artist.start_location
		return value?.country ? value : undefined
	}

	const date = createMemo(() => {
		if (
			context.artist.artist_type === "Unknown"
			|| !context.artist.start_date
		) {
			return
		}

		return DateWithPrecision.display(context.artist.start_date)
	})

	const label = () => {
		switch (context.artist.artist_type) {
			case "Solo": {
				return t`Born`
			}
			case "Multiple": {
				return t`Formed`
			}
			case "Unknown": {
				return t`Origin`
			}
		}
	}

	return (
		<Show when={date() || startLocation()}>
			<div {...stylex.attrs(styles.infoCell)}>
				<span {...stylex.attrs(infoStyles.label)}>{label()}</span>
				<div {...stylex.attrs(styles.infoValue, infoStyles.detail)}>
					<Show when={date()}>{(value) => <span>{value()}</span>}</Show>
					<Show when={startLocation()}>
						{(value) => <LocationValue location={value()} />}
					</Show>
				</div>
			</div>
		</Show>
	)
}

function Aliases() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)
	const aliases = createMemo(() => getInfoAliases(context.artist))
	return (
		<Show when={aliases().length > 0}>
			<div {...stylex.attrs(styles.infoCell)}>
				<span {...stylex.attrs(infoStyles.label)}>{t`Aliases`}</span>
				<ul {...stylex.attrs(styles.inlineList, infoStyles.detail)}>
					<Intersperse
						of={aliases()}
						with=", "
					>
						{(alias) => (
							<li {...stylex.attrs(styles.inlineListItem)}>
								<Show
									when={alias.id}
									fallback={alias.name}
								>
									{alias.id}
								</Show>
							</li>
						)}
					</Intersperse>
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
			<div {...stylex.attrs(styles.infoCell)}>
				<span {...stylex.attrs(infoStyles.label)}>{props.label}</span>
				<div {...stylex.attrs(infoStyles.detail)}>{parsedDate()}</div>
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
			<div {...stylex.attrs(styles.infoCell)}>
				<span {...stylex.attrs(infoStyles.label)}>{label()}</span>
				<ul {...stylex.attrs(styles.inlineList)}>
					<Intersperse
						of={context.artist.memberships}
						with=", "
					>
						{(membership) => (
							<li {...stylex.attrs(styles.inlineListItem)}>
								<Link
									to="/artist/$id"
									params={{ id: membership.artist.id.toString() }}
									{...stylex.attrs(link.base, link.withUnderline)}
								>
									{membership.artist.name}
								</Link>
							</li>
						)}
					</Intersperse>
				</ul>
			</div>
		</Show>
	)
}

function Location(props: {
	location?: Artist["start_location"]
	label: string
}) {
	const displayedLocation = () => {
		const value = props.location
		return value?.country ? value : undefined
	}

	return (
		<Show when={displayedLocation()}>
			{(value) => (
				<div {...stylex.attrs(styles.infoCell)}>
					<span {...stylex.attrs(infoStyles.label)}>{props.label}</span>
					<div {...stylex.attrs(infoStyles.detail)}>
						<LocationValue location={value()} />
					</div>
				</div>
			)}
		</Show>
	)
}

type ArtistLocation = NonNullable<Artist["start_location"]>

function LocationValue(props: { location: ArtistLocation }) {
	return (
		<span>
			{props.location.country}
			{props.location.province && <>, {props.location.province}</>}
			{props.location.city && <>, {props.location.city}</>}
		</span>
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
