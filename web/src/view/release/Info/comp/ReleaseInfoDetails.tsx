import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Show } from "solid-js"

import { ExternalLinks } from "~/component/data/ExternalLinks"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { palette } from "~/style/color/palette.stylex"
import { radius, colors, lineHeights, fontSizes } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

const styles = stylex.create({
	details: {
		display: "contents",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	detailLabel: { color: colors.textTertiary },
	releaseDate: { color: palette.slate[900] },
	recordingRange: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
	},
	rangeSeparator: { whiteSpace: "pre", color: colors.textTertiary },
	catalogs: { display: "flex", flexWrap: "wrap", alignItems: "baseline" },
	catalogSeparator: { whiteSpace: "pre" },
	catalog: { borderRadius: radius.sm },
	links: { display: "contents" },
})

export function ReleaseInfoDetails() {
	const { t } = useLingui()
	const ctx = assertContext(ReleaseInfoPageContext)

	return (
		<div {...stylex.attrs(styles.details)}>
			<div {...stylex.attrs(styles.detailLabel)}>{t`Type`}</div>
			<div>{ctx.release.release_type}</div>
			<Show when={ctx.release.release_date}>
				<span {...stylex.attrs(styles.detailLabel)}>{t`Released`}</span>
				<span {...stylex.attrs(styles.releaseDate)}>
					{DateWithPrecision.display(ctx.release.release_date)}
				</span>
			</Show>

			<Show
				when={
					ctx.release.recording_date_start ?? ctx.release.recording_date_end
				}
			>
				<span {...stylex.attrs(styles.detailLabel)}>{t`Recorded`}</span>
				<div {...stylex.attrs(styles.recordingRange)}>
					<Show when={ctx.release.recording_date_start}>
						<span>
							{DateWithPrecision.display(ctx.release.recording_date_start)}
						</span>
					</Show>
					<Show when={ctx.release.recording_date_end}>
						<span {...stylex.attrs(styles.rangeSeparator)}> - </span>
						<span>
							{DateWithPrecision.display(ctx.release.recording_date_end)}
						</span>
					</Show>
				</div>
			</Show>

			<Show
				when={ctx.release.catalog_nums && ctx.release.catalog_nums.length > 0}
			>
				<span {...stylex.attrs(styles.detailLabel)}>{t`Catalog Nums`}</span>
				<ul {...stylex.attrs(styles.catalogs)}>
					<Intersperse
						of={ctx.release.catalog_nums}
						with={<span {...stylex.attrs(styles.catalogSeparator)}> / </span>}
					>
						{(catalog) => (
							<li {...stylex.attrs(styles.catalog)}>
								{catalog.catalog_number}
							</li>
						)}
					</Intersperse>
				</ul>
			</Show>

			<ExternalLinks
				links={ctx.release.links}
				styles={styles.links}
				labelStyles={styles.detailLabel}
			/>
		</div>
	)
}
