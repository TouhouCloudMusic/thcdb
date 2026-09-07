import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { CreditRoleRef, Release, SimpleArtist } from "@thc/api"
import { For, Show } from "solid-js"

import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	roleSpacing: {
		marginBlockStart: 0,
		marginBlockEnd: { default: null, ":not(:last-child)": px[2] },
	},
	credits: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(1, minmax(0, 1fr))",
			"@media (min-width: 64rem)": "repeat(2, minmax(0, 1fr))",
		},
		columnGap: px[32],
	},
	credit: { paddingBlock: px[8] },
	artist: {
		color: colors.textPrimary,
		textUnderlineOffset: "4px",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	roles: {
		marginTop: px[4],
		fontSize: fontSizes.sm,
		lineHeight: 1.625,
		letterSpacing: "0.05em",
		color: colors.textTertiary,
	},
	annotationSeparator: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		whiteSpace: "pre",
	},
	annotation: { fontSize: fontSizes.xs, lineHeight: lineHeights.xs },
})

type ReleaseCredit = NonNullable<Release["credits"]>[number]
type GroupedReleaseCredit = {
	artist: SimpleArtist
	items: { role: CreditRoleRef; on?: number[] | null | undefined }[]
}

type ReleaseInfoCreditsProps = {
	credits?: Release["credits"] | null
}

export function ReleaseInfoCredits(props: ReleaseInfoCreditsProps) {
	const grouped = () =>
		groupByArtist(props.credits ?? []).toSorted((a, b) =>
			a.artist.name.localeCompare(b.artist.name),
		)

	return (
		<Show when={grouped().length > 0}>
			<ul {...stylex.attrs(styles.credits)}>
				<For each={grouped()}>{(g) => <GroupedCreditItem group={g} />}</For>
			</ul>
		</Show>
	)
}

function groupByArtist(credits: ReleaseCredit[]): GroupedReleaseCredit[] {
	return credits.reduce<GroupedReleaseCredit[]>((ret, credit) => {
		const existing = ret.find((g) => g.artist.id === credit.artist.id)
		if (existing) {
			existing.items.push({ role: credit.role, on: credit.on })
		} else {
			ret.push({
				artist: credit.artist,
				items: [{ role: credit.role, on: credit.on }],
			})
		}
		return ret
	}, [])
}

function GroupedCreditItem(props: { group: GroupedReleaseCredit }) {
	return (
		<li {...stylex.attrs(styles.credit)}>
			<div>
				<Link
					to="/artist/$id"
					params={{ id: props.group.artist.id.toString() }}
					{...stylex.attrs(styles.artist)}
				>
					{props.group.artist.name}
				</Link>
			</div>
			<ul {...stylex.attrs(styles.roles)}>
				<For each={props.group.items}>
					{(item) => (
						<li {...stylex.attrs(styles.roleSpacing)}>
							<span>{item.role.name}</span>
							<Show when={item.on && item.on.length > 0}>
								<span {...stylex.attrs(styles.annotationSeparator)}>: </span>
								<span {...stylex.attrs(styles.annotation)}>
									{item.on!.join(", ")}
								</span>
							</Show>
						</li>
					)}
				</For>
			</ul>
		</li>
	)
}
