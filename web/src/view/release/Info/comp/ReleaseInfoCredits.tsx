import { Trans } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { Release, ReleaseCredit } from "@thc/api"
import { createMemo, For, Show } from "solid-js"

import { link } from "~/style/link"
import { infoStyles } from "~/style/primitives"
import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	section: { display: "flex", flexDirection: "column", gap: px[12] },
	title: {
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	creditsList: {
		display: "flex",
		flexDirection: "column",
		gap: px[2],
		overflowWrap: "anywhere",
	},
})

type ReleaseInfoCreditsProps = { credits?: Release["credits"] | null }

export function ReleaseInfoCredits(props: ReleaseInfoCreditsProps) {
	const credits = createMemo(() => {
		const grouped = new Map<
			number,
			{ artist: ReleaseCredit["artist"]; roles: ReleaseCredit["role"][] }
		>()
		for (const credit of props.credits ?? []) {
			if (credit.on !== null && credit.on !== undefined) continue

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
		return [...grouped.values()].toSorted((a, b) =>
			a.artist.name.localeCompare(b.artist.name),
		)
	})

	return (
		<Show when={credits().length > 0}>
			<section {...stylex.attrs(styles.section)}>
				<h4 {...stylex.attrs(styles.title)}>
					<Trans>Credits</Trans>
				</h4>
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
								<span>{credit.roles.map((role) => role.name).join(", ")}</span>
							</li>
						)}
					</For>
				</ul>
			</section>
		</Show>
	)
}
