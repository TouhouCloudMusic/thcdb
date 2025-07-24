/* @refresh skip */
import { Trans } from "@lingui-solid/solid/macro"
import { createSignal, For } from "solid-js"

import { assertContext } from "~/utils/context"

import { SongInfoPageContext } from ".."

export function SongInfoLyrics() {
	const ctx = assertContext(SongInfoPageContext)

	const lyricsList = () => ctx.song.lyrics
	const langs = () => ctx.song.lyrics?.map((x) => x.language!)
	const [activeLang, setActiveLang] = createSignal(
		lyricsList()?.find((x) => x.is_main)!.language_id!,
	)

	return (
		<div class="space-y-8 p-6">
			<div class="flex items-baseline gap-6">
				<label
					for="lyrics-language-select"
					class="text-xs font-medium tracking-widest text-secondary uppercase"
				>
					<Trans>Language</Trans>
				</label>
				<select
					id="lyrics-language-select"
					class="border-0 border-b border-slate-400 px-1 py-2 text-sm font-light tracking-wide text-secondary transition-all duration-150 focus:outline-none"
					onChange={(e) => {
						setActiveLang(Number.parseInt(e.target.value, 10))
					}}
				>
					<For each={langs()}>
						{(lang) => (
							<option
								value={lang.id}
								selected={lang.id == activeLang()}
							>
								{lang.name}
							</option>
						)}
					</For>
				</select>
			</div>

			<div>
				<div class="text-lg leading-relaxed font-light whitespace-pre-wrap text-secondary">
					{lyricsList()?.find((x) => x.language_id == activeLang())?.content}
				</div>
			</div>
		</div>
	)
}
