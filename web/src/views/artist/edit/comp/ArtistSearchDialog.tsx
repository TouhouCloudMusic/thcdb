import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { ArtistQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createSignal, For, createMemo, Suspense } from "solid-js"
import type { JSX } from "solid-js"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/components/atomic/button"
import { Dialog } from "~/components/dialog"
import { SearchDialog } from "~/components/form/SearchDialog"

type ArtistSearchDialogProps = {
	onSelect: (artist: Artist) => void
	disabled?: boolean
	filter?: ArtistCommonFilter
}

export function ArtistSearchDialog(
	props: ArtistSearchDialogProps,
): JSX.Element {
	const { t } = useLingui()

	const [searchKeyword, setSearchKeyword] = createSignal("")

	// oxlint-disable-next-line no-magic-numbers
	const onInput = debounce(300, (e: Event) => {
		setSearchKeyword((e.target as HTMLInputElement).value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const artistsQuery = useQuery(() => ({
		...ArtistQueryOption.findByKeyword(searchTerm()!, {
			artist_type: props.filter?.artist_type,
		}),
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
				<PlusIcon class="size-4 text-slate-600" />
			</Dialog.Trigger>

			<SearchDialog.Content>
				<div class="mb-6 space-y-4">
					<SearchDialog.Label>
						<Trans>Search Artist</Trans>
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
						<For
							each={artistsQuery.data?.filter(
								(x) => !props.filter?.exclusion?.includes(x.id),
							)}
						>
							{(artist) => (
								<li class="group relative border-slate-300 p-4 text-left transition-all duration-150 not-first:border-t last:border-b hover:bg-slate-100 active:bg-slate-100">
									<div class="absolute top-0 left-0 h-full w-px origin-left scale-y-0 transform-gpu bg-reimu-600 transition-all ease-in-out group-hover:scale-y-100"></div>
									<button
										type="button"
										class="w-full"
										onClick={() => props.onSelect(artist)}
									>
										<div class="flex items-center justify-between">
											<div class="text-left text-lg font-light text-primary">
												{artist.name}
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
