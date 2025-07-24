/* @refresh skip */
import { Trans } from "@lingui-solid/solid/macro"
import { Link } from "@tanstack/solid-router"
import { createMemo, For, Match, Show, Switch } from "solid-js"

import { assertContext } from "~/utils/context"

import { SongInfoPageContext } from ".."

export function SongInfoTitleAndCreditName() {
	const context = assertContext(SongInfoPageContext)
	const localizedTitle = createMemo(
		() =>
			["en", "ja"].map((code) =>
				context.song.localized_titles?.find(
					// TODO: user defined language
					(title) => title.language.code === code,
				),
			)[0],
	)
	return (
		<header class="space-y-4">
			<div>
				<h1 class="text-3xl leading-tight font-light tracking-tight text-primary">
					{context.song.title}
				</h1>
				<Show when={localizedTitle()}>
					<div class="text-base font-light tracking-wide text-tertiary">
						{localizedTitle()!.title}
					</div>
				</Show>
			</div>

			<Switch>
				{/* TODO: Credit name */}
				<Match when={context.song.artists?.length}>
					<div>
						{/* TODO: use Info.Label */}
						<div class="text-xs font-medium tracking-wider text-tertiary">
							<Trans>Artist</Trans>
						</div>
						<ul class="flex flex-wrap gap-x-4 gap-y-1">
							<For each={context.song.artists}>
								{(artist) => (
									<li>
										<Link
											to="/artist/$id"
											params={{ id: artist.id.toString() }}
											class="text-lg font-light text-secondary underline-offset-4 transition-all duration-200 hover:underline"
										>
											{artist.name}
										</Link>
									</li>
								)}
							</For>
						</ul>
					</div>
				</Match>
			</Switch>
		</header>
	)
}
