/* @refresh skip */
import { For, Show } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

export function SongInfoLanguages() {
	const ctx = assertContext(SongInfoPageContext)

	return (
		<Show when={ctx.song.languages?.length}>
			<div>
				{/* TODO: Replace Info.Label with this */}
				<div class="text-xs font-medium tracking-wider text-tertiary">
					Languages
				</div>
				<div class="flex flex-wrap gap-x-4 gap-y-1">
					<For each={ctx.song.languages}>
						{(lang) => (
							<span class="text-base font-light text-secondary">
								{lang.name}
							</span>
						)}
					</For>
				</div>
			</div>
		</Show>
	)
}
