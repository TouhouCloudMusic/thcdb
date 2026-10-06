import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For, Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { infoStyles } from "~/style/primitives"

const styles = stylex.create({
	list: { minWidth: 0, overflowWrap: "anywhere" },
	link: { color: palette.blue[600] },
})

export function ExternalLinks(props: { links?: readonly string[] | null }) {
	const { t } = useLingui()

	return (
		<Show when={props.links?.length}>
			<span {...stylex.attrs(infoStyles.label)}>{t`Links`}</span>
			<ul {...stylex.attrs(styles.list)}>
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
		</Show>
	)
}
