import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { For, createMemo } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { radius, colors, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: { display: "inline-flex", alignItems: "center", gap: px[8] },
	item: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.md,
		fontVariantNumeric: "tabular-nums",
		cursor: { default: null, ":disabled": "not-allowed" },
		opacity: { default: null, ":disabled": 0.4 },
		width: px[36],
		height: px[36],
		backgroundColor: {
			default: null,
			":hover": {
				default: null,
				"@media (hover: hover)": {
					default: colors.backgroundSecondary,
					":disabled": "transparent",
				},
			},
		},
	},
	current: {
		backgroundColor: {
			default: palette.slate[900],
			":hover": { default: null, "@media (hover: hover)": palette.slate[900] },
			":active": palette.slate[800],
			":disabled": palette.slate[800],
		},
		color: colors.backgroundPrimary,
	},
})

type PaginationProps = {
	current: number
	onPageChange: (page: number) => void
	total: number
	nearbyCount?: number
	styles?: StyleXStyles
}

const buildNearbyPages = (
	current: number,
	total: number,
	nearbyCount: number,
) => {
	if (total <= 0) return []

	const count = Math.max(1, Math.floor(nearbyCount))
	const half = Math.floor(count / 2)

	let start = current - half
	let end = start + count - 1

	if (start < 1) {
		start = 1
		end = Math.min(total, start + count - 1)
	}

	if (end > total) {
		end = total
		start = Math.max(1, end - count + 1)
	}

	const pages: number[] = []
	for (let p = start; p <= end; p++) pages.push(p)
	return pages
}

export function Pagination(props: PaginationProps) {
	const { t } = useLingui()

	const nearbyCount = () => props.nearbyCount ?? 7
	const pages = createMemo(() =>
		buildNearbyPages(props.current, props.total, nearbyCount()),
	)

	const canPrev = () => props.current > 1
	const canNext = () => props.current < props.total

	return (
		<nav
			{...stylex.attrs(styles.root, props.styles)}
			aria-label={t`Pagination`}
		>
			<button
				type="button"
				{...stylex.attrs(styles.item)}
				onClick={() => props.onPageChange(1)}
				disabled={!canPrev()}
				aria-label={t`First page`}
			>
				{"<<"}
			</button>

			<button
				type="button"
				{...stylex.attrs(styles.item)}
				onClick={() => props.onPageChange(props.current - 1)}
				disabled={!canPrev()}
				aria-label={t`Previous page`}
			>
				{"<"}
			</button>

			<For each={pages()}>
				{(page) => (
					<button
						type="button"
						{...stylex.attrs(
							styles.item,
							page === props.current && styles.current,
						)}
						onClick={() => props.onPageChange(page)}
						data-current={page === props.current ? "" : undefined}
						aria-current={page === props.current ? "page" : undefined}
					>
						{page}
					</button>
				)}
			</For>

			<button
				type="button"
				{...stylex.attrs(styles.item)}
				onClick={() => props.onPageChange(props.current + 1)}
				disabled={!canNext()}
				aria-label={t`Next page`}
			>
				{">"}
			</button>

			<button
				type="button"
				{...stylex.attrs(styles.item)}
				onClick={() => props.onPageChange(props.total)}
				disabled={!canNext()}
				aria-label={t`Last page`}
			>
				{">>"}
			</button>
		</nav>
	)
}
