import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { For } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { infoStyles } from "~/style/primitives"

const styles = stylex.create({
	list: { minWidth: 0, overflowWrap: "anywhere" },
	link: { color: palette.blue[600] },
})

export function Label(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	return (
		<span {...stylex.attrs(infoStyles.label, props.styles)}>{t`Links`}</span>
	)
}

export function Body(props: {
	links?: readonly string[] | null
	styles?: StyleXStyles
}) {
	return (
		<ul {...stylex.attrs(styles.list, props.styles)}>
			<For each={props.links}>
				{(url) => (
					<li>
						<a
							{...stylex.attrs(link.base, link.withUnderline, styles.link)}
							href={url}
							target="_blank"
							rel="noopener noreferrer"
						>
							{url.replace(/^https?:\/\//iu, "")}
						</a>
					</li>
				)}
			</For>
		</ul>
	)
}
