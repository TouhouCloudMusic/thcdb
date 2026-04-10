import { t } from "@lingui/core/macro"
import type { Tag } from "@thc/api"
import type { JSX } from "solid-js"
import { For, Show, Suspense, createSignal } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import * as SearchDialog from "~/component/form/SearchDialog/__internal"
import { useTagSearch } from "~/component/form/SearchDialog/useTagSearch"

import type { EntityTagVoteValue } from "./model"
import { ENTITY_TAG_VOTE_OPTIONS } from "./model"

type EntityTagAddDialogProps = {
	trigger: JSX.Element
	dataFilter?: (tag: Tag) => boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
}

export function EntityTagAddDialog(
	props: EntityTagAddDialogProps,
): JSX.Element {
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
				<div class="mb-6 space-y-4">
					<SearchDialog.Label>{t`Add Tag`}</SearchDialog.Label>
					<SearchDialog.Input
						placeholder={t`Search tag...`}
						value={searchKeyword()}
						onInput={(event) => onInput(event.currentTarget.value)}
						class="h-9 w-full"
					/>
				</div>

				<SearchDialog.List>
					<Suspense>
						<For each={items()}>
							{(tag) => {
								const isPending = () => props.pendingKey === `vote:${tag.id}`
								return (
									<SearchDialog.Item>
										<SearchDialog.ItemIndicator />
										<div class="flex w-full flex-col gap-3">
											<div class="flex flex-col text-left font-light text-primary">
												<div class="flex items-baseline gap-2">
													<span class="text-lg">{tag.name}</span>
													<span class="text-sm text-tertiary">{tag.type}</span>
												</div>
												<Show when={tag.short_description}>
													<div class="line-clamp-2 text-sm text-tertiary">
														{tag.short_description}
													</div>
												</Show>
											</div>
											<div class="flex items-center gap-2">
												<For each={ENTITY_TAG_VOTE_OPTIONS}>
													{(option) => (
														<Button
															size="Sm"
															variant="SecondaryV2"
															disabled={isPending()}
															onClick={() => {
																void props
																	.onVote(tag.id, option.value)
																	.then(() => {
																		handleOpenChange(false)
																		return undefined
																	})
															}}
															class={twJoin(
																"min-w-16",
																isPending() && "opacity-70",
															)}
														>
															{option.label}
														</Button>
													)}
												</For>
											</div>
										</div>
									</SearchDialog.Item>
								)
							}}
						</For>
					</Suspense>
				</SearchDialog.List>
			</SearchDialog.Content>
		</SearchDialog.Root>
	)
}
