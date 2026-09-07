import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { JSX } from "solid-js"
import { For, Suspense } from "solid-js"

import { px } from "~/style/tokens.stylex"

import * as SearchDialog from "./__internal"

const styles = stylex.create({
	title: { marginBlockStart: 0, marginBlockEnd: px[16] },
	header: { marginBottom: px[24] },
	input: { height: px[36], width: "100%" },
	select: { width: "100%" },
})

type EntitySearchDialogProps<T> = {
	title: JSX.Element
	trigger: JSX.Element
	value: string
	onInput: (value: string) => void
	onSelect: (item: T) => void
	items?: T[] | undefined
	item: (item: T) => JSX.Element
}

export function EntitySearchDialog<T>(
	props: EntitySearchDialogProps<T>,
): JSX.Element {
	const { t } = useLingui()
	return (
		<SearchDialog.Root>
			{props.trigger}
			<SearchDialog.Content>
				<div {...stylex.attrs(styles.header)}>
					<SearchDialog.Label styles={styles.title}>
						{props.title}
					</SearchDialog.Label>
					<SearchDialog.Input
						placeholder={t`Search...`}
						value={props.value}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						styles={styles.input}
					/>
				</div>

				<ul {...stylex.attrs(SearchDialog.searchDialogStyles.list)}>
					<Suspense>
						<For each={props.items}>
							{(item) => (
								<li
									{...stylex.attrs(
										stylex.defaultMarker(),
										SearchDialog.searchDialogStyles.item,
									)}
								>
									<div
										{...stylex.attrs(SearchDialog.searchDialogStyles.indicator)}
									></div>
									<button
										type="button"
										{...stylex.attrs(styles.select)}
										onClick={() => props.onSelect(item)}
									>
										{props.item(item)}
									</button>
								</li>
							)}
						</For>
					</Suspense>
				</ul>
			</SearchDialog.Content>
		</SearchDialog.Root>
	)
}
