import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { For, Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes } from "~/style/tokens.stylex"

const styles = stylex.create({
	label: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	link: { color: palette.blue[600] },
})

export function ExternalLinks(props: {
	links?: readonly string[] | null
	styles?: StyleXStyles
	labelStyles?: StyleXStyles
	linkStyles?: StyleXStyles
}) {
	const { t } = useLingui()

	return (
		<Show when={props.links?.length}>
			<div {...stylex.attrs(props.styles)}>
				<span
					{...stylex.attrs(props.labelStyles ?? styles.label)}
				>{t`Links`}</span>
				<ul>
					<For each={props.links}>
						{(link) => (
							<li>
								<a
									{...stylex.attrs(styles.link, props.linkStyles)}
									href={link}
									target="_blank"
									rel="noopener noreferrer"
								>
									{link}
								</a>
							</li>
						)}
					</For>
				</ul>
			</div>
		</Show>
	)
}
