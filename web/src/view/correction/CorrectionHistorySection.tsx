import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { CorrectionHistoryItem } from "@thc/api"
import { For, Suspense } from "solid-js"

import { buttonStyles } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { formatTimestamp } from "~/utils/dateTime"

const styles = stylex.create({
	listChild: {
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: palette.slate[200],
	},
	item: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
	},
	current: {
		borderColor: palette.blue[300],
		boxShadow: `0 0 0 1px ${palette.blue[200]}`,
	},
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-start",
		gap: px[12],
		backgroundColor: colors.backgroundSecondary,
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[8],
		paddingBottom: px[8],
		borderColor: palette.slate[300],
	},
	identifier: {
		alignSelf: "center",
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	timestamp: {
		height: "100%",
		alignSelf: "center",
		marginLeft: "auto",
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	viewDiff: {
		boxShadow: "0 0 #0000",
		paddingLeft: px[8],
		paddingRight: px[8],
		fontWeight: 400,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
	},
	metadata: {
		display: "grid",
		gridTemplateColumns: "auto 1fr",
		paddingTop: px[8],
		paddingRight: px[8],
		paddingBottom: px[8],
		paddingLeft: px[8],
		gap: px[8],
	},
	author: { color: palette.blue[700] },
	label: { color: colors.textTertiary },
	loading: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	list: { overflow: "hidden", backgroundColor: colors.backgroundPrimary },
	empty: {
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

type CorrectionHistoryItemProps = {
	styles?: StyleXStyles
	item: CorrectionHistoryItem
	isCurrent: boolean
	previousId?: number
}

function CorrectionHistoryItemEntry(props: CorrectionHistoryItemProps) {
	const { t } = useLingui()
	return (
		<li
			{...stylex.attrs(
				props.styles,
				styles.item,
				props.isCurrent && styles.current,
			)}
		>
			<div {...stylex.attrs(styles.header)}>
				<div {...stylex.attrs(styles.identifier)}>#{props.item.id}</div>

				<div {...stylex.attrs(styles.timestamp)}>
					{formatTimestamp(
						props.item.handled_at ?? props.item.created_at,
						t`None`,
					)}
				</div>
				<Link
					to="/correction/$id"
					params={{ id: props.item.id.toString() }}
					search={{ compare: props.previousId }}
					class={
						stylex.attrs(
							link.base,
							buttonStyles.base,
							buttonStyles.outline,
							buttonStyles.gray,
							buttonStyles.sm,
							styles.viewDiff,
						).class
					}
				>
					View diff
				</Link>
			</div>
			{/* Table content */}
			<div {...stylex.attrs(styles.metadata)}>
				<For
					each={[
						[
							t`Author`,
							<Link
								to={"/profile/$username"}
								params={{
									username: props.item.author.name,
								}}
								class={stylex.attrs(link.base, link.text, styles.author).class}
							>
								{props.item.author.name}
							</Link>,
						],
						[t`Description`, props.item.description],
					]}
				>
					{(item) => (
						<>
							<div {...stylex.attrs(styles.label)}>{item[0]}</div>
							<div>{item[1]}</div>
						</>
					)}
				</For>
			</div>
		</li>
	)
}

type CorrectionHistorySectionProps = {
	currentCorrectionId?: number
	items?: CorrectionHistoryItem[]
	styles?: StyleXStyles
}

export function CorrectionHistorySection(props: CorrectionHistorySectionProps) {
	const { t } = useLingui()
	return (
		<section {...stylex.attrs(props.styles)}>
			<Suspense
				fallback={<div {...stylex.attrs(styles.loading)}>{t`Loading...`}</div>}
			>
				<ul {...stylex.attrs(styles.list)}>
					<For
						each={props.items}
						fallback={
							<li {...stylex.attrs(styles.listChild, styles.empty)}>
								No corrections yet.
							</li>
						}
					>
						{(item, index) => (
							<CorrectionHistoryItemEntry
								item={item}
								isCurrent={item.id === props.currentCorrectionId}
								previousId={props.items?.[index() + 1]?.id}
								styles={styles.listChild}
							/>
						)}
					</For>
				</ul>
			</Suspense>
		</section>
	)
}
