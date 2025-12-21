import { Link } from "@tanstack/solid-router"
import { createMemo, Show } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { getPreferredLocalizedTitle } from "~/domain/localized_title"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

export function ReleaseInfoTitleAndArtist() {
	const ctx = assertContext(ReleaseInfoPageContext)

	const preferredLocalizedTitle = createMemo(() =>
		getPreferredLocalizedTitle(ctx.release.localized_titles),
	)

	return (
		<div class="space-y-2">
			<div>
				<h1 class="text-2xl text-primary">{ctx.release.title}</h1>

				<Show when={preferredLocalizedTitle()}>
					<p class="text-lg text-tertiary">
						{preferredLocalizedTitle()!.title}
					</p>
				</Show>
			</div>
			<div class="flex items-center">
				<span class="mr-2 text-tertiary">by</span>
				<Intersperse
					of={ctx.release.artists}
					with={<span class="whitespace-pre">, </span>}
				>
					{(artist) => (
						<Link
							to="/artist/$id"
							params={{ id: artist.id.toString() }}
							class="text-primary underline-offset-4 transition-colors hover:underline"
						>
							{artist.name}
						</Link>
					)}
				</Intersperse>
			</div>
		</div>
	)
}
