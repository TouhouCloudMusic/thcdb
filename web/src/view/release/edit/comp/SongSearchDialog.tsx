import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Song } from "@thc/api"
import { SongQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createMemo, createSignal, Suspense, For } from "solid-js"
import type { JSX } from "solid-js"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { SearchDialog } from "~/component/form/SearchDialog"

type Props = {
	icon?: JSX.Element
	onSelect: (song: Song) => void
	disabled?: boolean
}

export function SongSearchDialog(props: Props): JSX.Element {
	const { t } = useLingui()
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (e: Event) => {
		setSearchKeyword((e.target as HTMLInputElement).value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const songsQuery = useQuery(() => ({
		...SongQueryOption.findByKeyword(searchTerm()!),
		placeholderData: id,
		enabled: Boolean(searchTerm()),
	}))

	return (
		<SearchDialog.Root>
			<Dialog.Trigger
				as={Button}
				variant="Tertiary"
				class="h-max p-2"
				disabled={props.disabled}
			>
				{props.icon}
			</Dialog.Trigger>

			<SearchDialog.Content>
				<div class="mb-6 space-y-4">
					<SearchDialog.Label>
						<Trans>Search Song</Trans>
					</SearchDialog.Label>
					<SearchDialog.Input
						placeholder={t`Search...`}
						value={searchKeyword()}
						onInput={onInput}
						class="h-9 w-full"
					/>
				</div>

				<SearchDialog.List>
					<Suspense>
						<For each={songsQuery.data}>
							{(song) => (
								<li class="group relative border-slate-300 p-4 text-left transition-all duration-150 not-first:border-t last:border-b hover:bg-slate-100 active:bg-slate-100">
									<div class="absolute top-0 left-0 h-full w-px origin-left scale-y-0 transform-gpu bg-reimu-600 transition-all ease-in-out group-hover:scale-y-100"></div>
									<button
										type="button"
										class="w-full"
										onClick={() => props.onSelect(song)}
									>
										<div class="flex items-center justify-between">
											<div class="text-left text-lg font-light text-primary">
												{song.title}
												{/* could render artists */}
											</div>
											<div class="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
												<PlusIcon class="size-4 text-tertiary" />
											</div>
										</div>
									</button>
								</li>
							)}
						</For>
					</Suspense>
				</SearchDialog.List>
			</SearchDialog.Content>
		</SearchDialog.Root>
	)
}
