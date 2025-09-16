import type { JSX } from "solid-js"
import { For, Suspense } from "solid-js"

import * as SearchDialog from "./__internal"

type EntitySearchDialogProps<T> = {
	title: JSX.Element
	trigger: JSX.Element
	value: string
	onInput: (e: Event) => void
	onSelect: (item: T) => void
	items?: T[] | undefined
	item: (item: T) => JSX.Element
}

export function EntitySearchDialog<T>(
	props: EntitySearchDialogProps<T>,
): JSX.Element {
	return (
		<SearchDialog.Root>
			{props.trigger}
			<SearchDialog.Content>
				<div class="mb-6 space-y-4">
					<SearchDialog.Label>{props.title}</SearchDialog.Label>
					<SearchDialog.Input
						placeholder={"Search..."}
						value={props.value}
						onInput={props.onInput}
						class="h-9 w-full"
					/>
				</div>

				<SearchDialog.List>
					<Suspense>
						<For each={props.items}>
							{(item) => (
								<SearchDialog.Item>
									<SearchDialog.ItemIndicator />
									<button
										type="button"
										class="w-full"
										onClick={() => props.onSelect(item)}
									>
										{props.item(item)}
									</button>
								</SearchDialog.Item>
							)}
						</For>
					</Suspense>
				</SearchDialog.List>
			</SearchDialog.Content>
		</SearchDialog.Root>
	)
}
