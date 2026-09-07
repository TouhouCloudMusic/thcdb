import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Tag } from "@thc/api"
import type { JSX } from "solid-js"
import { For, Show, Suspense, createSignal } from "solid-js"

import { Button } from "~/component/atomic/button"
import * as SearchDialog from "~/component/form/SearchDialog/__internal"
import { useTagSearch } from "~/component/form/SearchDialog/useTagSearch"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import type { EntityTagVoteValue } from "./model"
import { ENTITY_TAG_VOTE_OPTIONS } from "./model"

const styles = stylex.create({
	searchChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[16] },
	},
	search: { marginBottom: px[24] },
	input: { height: px[36], width: "100%" },
	tag: {
		display: "flex",
		width: "100%",
		flexDirection: "column",
		gap: px[12],
	},
	summary: {
		display: "flex",
		flexDirection: "column",
		textAlign: "left",
		fontWeight: 300,
		color: colors.textPrimary,
	},
	heading: { display: "flex", alignItems: "baseline", gap: px[8] },
	name: { fontSize: fontSizes.lg, lineHeight: lineHeights.lg },
	type: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	description: {
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 2,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	votes: { display: "flex", alignItems: "center", gap: px[8] },
	vote: { minWidth: px[64] },
	pendingVote: { opacity: 0.7 },
})

type EntityTagAddDialogProps = {
	trigger: JSX.Element
	dataFilter?: (tag: Tag) => boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
}

function VoteOptionLabel(props: { value: EntityTagVoteValue }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.value) {
			case "High": {
				return t`High`
			}
			case "Medium": {
				return t`Medium`
			}
			case "Low": {
				return t`Low`
			}
			case "Veto": {
				return t`Downvote`
			}
		}
	}

	return <>{label()}</>
}

export function EntityTagAddDialog(
	props: EntityTagAddDialogProps,
): JSX.Element {
	const { t } = useLingui()
	const [open, setOpen] = createSignal(false)
	const { searchKeyword, onInput, items, reset } = useTagSearch(
		() => props.dataFilter,
	)

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (!newOpen) {
			reset()
		}
	}

	return (
		<SearchDialog.Root
			open={open()}
			onOpenChange={handleOpenChange}
		>
			{props.trigger}
			<SearchDialog.Content>
				<div {...stylex.attrs(styles.search)}>
					<SearchDialog.Label
						styles={styles.searchChild}
					>{t`Add Tag`}</SearchDialog.Label>
					<SearchDialog.Input
						placeholder={t`Search tag...`}
						value={searchKeyword()}
						onInput={(event) => onInput(event.currentTarget.value)}
						styles={[styles.searchChild, styles.input]}
					/>
				</div>

				<ul {...stylex.attrs(SearchDialog.searchDialogStyles.list)}>
					<Suspense>
						<For each={items()}>
							{(tag) => {
								const isPending = () => props.pendingKey === `vote:${tag.id}`
								return (
									<li
										{...stylex.attrs(
											stylex.defaultMarker(),
											SearchDialog.searchDialogStyles.item,
										)}
									>
										<div
											{...stylex.attrs(
												SearchDialog.searchDialogStyles.indicator,
											)}
										></div>
										<div {...stylex.attrs(styles.tag)}>
											<div {...stylex.attrs(styles.summary)}>
												<div {...stylex.attrs(styles.heading)}>
													<span {...stylex.attrs(styles.name)}>{tag.name}</span>
													<span {...stylex.attrs(styles.type)}>{tag.type}</span>
												</div>
												<Show when={tag.short_description}>
													<div {...stylex.attrs(styles.description)}>
														{tag.short_description}
													</div>
												</Show>
											</div>
											<div {...stylex.attrs(styles.votes)}>
												<For each={ENTITY_TAG_VOTE_OPTIONS}>
													{(option) => (
														<Button
															disabled={isPending()}
															onClick={() => {
																void props
																	.onVote(tag.id, option.value)
																	.then(() => {
																		handleOpenChange(false)
																		return undefined
																	})
															}}
															appearance="outline"
															tone="gray"
															size="sm"
															styles={[
																styles.vote,
																isPending() && styles.pendingVote,
															]}
														>
															<VoteOptionLabel value={option.value} />
														</Button>
													)}
												</For>
											</div>
										</div>
									</li>
								)
							}}
						</For>
					</Suspense>
				</ul>
			</SearchDialog.Content>
		</SearchDialog.Root>
	)
}
