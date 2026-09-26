import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Match, Show, Suspense, Switch } from "solid-js"
import type { JSX } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Intersperse } from "~/component/data/Intersperse"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	section: {
		display: "grid",
		gap: px[8],
		minWidth: 0,
	},
	body: {
		height: `calc(5 * ${px[64]} + 4 * (2 * ${px[8]} + 1px))`,
	},
	list: {
		display: "grid",
		gridAutoRows: `${px[64]} auto`,
		gap: px[8],
		alignContent: "start",
	},
	divider: {
		borderBlockStartColor: palette.slate[300],
	},
	status: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	pagination: {
		display: "flex",
		justifyContent: "center",
		minHeight: px[36],
	},
})

export type TagResultsStore<T> = {
	data?: { items: T[]; page: number; total_pages: number }
	status: "pending" | "error" | "success"
	setPage: (page: number) => void
}

type TagResultsSectionProps<T> = {
	title: string
	emptyMessage: string
	store: TagResultsStore<T>
	renderItem: (item: T) => JSX.Element
}

export function TagResultsSection<T>(props: TagResultsSectionProps<T>) {
	const { t } = useLingui()

	return (
		<section
			{...stylex.attrs(styles.section)}
			aria-label={props.title}
		>
			<div {...stylex.attrs(styles.body)}>
				<Suspense
					fallback={<p {...stylex.attrs(styles.status)}>{t`Loading...`}</p>}
				>
					<Switch>
						<Match when={props.store.status === "pending"}>
							<p {...stylex.attrs(styles.status)}>{t`Loading...`}</p>
						</Match>
						<Match when={props.store.status === "error"}>
							<p
								{...stylex.attrs(styles.status)}
							>{t`Failed to load results`}</p>
						</Match>
						<Match when={!props.store.data?.items.length}>
							<p {...stylex.attrs(styles.status)}>{props.emptyMessage}</p>
						</Match>
						<Match when={props.store.data?.items.length}>
							<div {...stylex.attrs(styles.list)}>
								<Intersperse
									of={props.store.data?.items ?? []}
									with={
										<hr
											{...stylex.attrs(
												dividerStyles.horizontal,
												styles.divider,
											)}
										/>
									}
								>
									{props.renderItem}
								</Intersperse>
							</div>
						</Match>
					</Switch>
				</Suspense>
			</div>

			<div {...stylex.attrs(styles.pagination)}>
				<Suspense>
					<Show when={(props.store.data?.total_pages ?? 0) > 1}>
						<Pagination
							current={props.store.data?.page ?? 1}
							total={props.store.data?.total_pages ?? 0}
							onPageChange={props.store.setPage}
							nearbyCount={3}
						/>
					</Show>
				</Suspense>
			</div>
		</section>
	)
}
