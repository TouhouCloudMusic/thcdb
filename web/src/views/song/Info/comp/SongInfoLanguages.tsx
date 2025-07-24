/* @refresh skip */
import { Trans } from "@lingui-solid/solid/macro"
import { For, Show } from "solid-js"

import { assertContext } from "~/utils/context"

import { SongInfoPageContext } from ".."

export function SongInfoLanguages() {
	const ctx = assertContext(SongInfoPageContext)

	return (
		<Show when={ctx.song.languages?.length}>
			<div>
				{/* TODO: Replace Info.Label with this */}
				<div class="text-xs font-medium tracking-wider text-tertiary">
					<Trans>Languages</Trans>
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
