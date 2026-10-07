import * as stylex from "@stylexjs/stylex"
/* @refresh skip */
import { For, Show } from "solid-js"

import { infoStyles } from "~/style/primitives"
import { colors, fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

const styles = stylex.create({
	values: {
		display: "flex",
		flexWrap: "wrap",
		columnGap: px[16],
		rowGap: px[4],
	},
	value: {
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		fontWeight: 300,
		color: colors.textSecondary,
	},
})

export function SongInfoLanguages() {
	const ctx = assertContext(SongInfoPageContext)

	return (
		<Show when={ctx.song.languages?.length}>
			<div>
				{/* TODO: Replace Info.Label with this */}
				<div {...stylex.attrs(infoStyles.label)}>Languages</div>
				<div {...stylex.attrs(styles.values)}>
					<For each={ctx.song.languages}>
						{(lang) => <span {...stylex.attrs(styles.value)}>{lang.name}</span>}
					</For>
				</div>
			</div>
		</Show>
	)
}
