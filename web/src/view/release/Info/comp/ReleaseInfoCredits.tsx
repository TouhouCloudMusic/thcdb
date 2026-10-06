import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createMemo, For, Show } from "solid-js"

import type { Release, ReleaseCredit } from "~/hey-api"
import { colors, fontSizes, px } from "~/style/tokens.stylex"

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
})

type ReleaseInfoCreditsProps = { credits?: Release["credits"] | null }

export function ReleaseInfoCredits(props: ReleaseInfoCreditsProps) {
	const credits = createMemo(() => {
		const grouped = new Map<
			number,
			{ artist: ReleaseCredit["artist"]; roles: ReleaseCredit["role"][] }
		>()
		for (const credit of props.credits ?? []) {
			if (credit.on !== null) continue

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
			<ul {...stylex.attrs(styles.credits)}>
				<For each={credits()}>
					{(credit) => (
						<li {...stylex.attrs(styles.credit)}>
							<div>
								<Link
									to="/artist/$id"
									params={{ id: credit.artist.id.toString() }}
									{...stylex.attrs(styles.artist)}
								>
									{credit.artist.name}
								</Link>
							</div>
							<ul {...stylex.attrs(styles.roles)}>
								<For each={credit.roles}>
									{(role) => (
										<li {...stylex.attrs(styles.roleSpacing)}>{role.name}</li>
									)}
								</For>
							</ul>
						</li>
					)}
				</For>
			</ul>
		</Show>
	)
}
