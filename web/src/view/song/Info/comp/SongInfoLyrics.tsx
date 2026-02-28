/* @refresh skip */
import { createSignal } from "solid-js"

import { Select } from "~/component/atomic/form/select"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

export function SongInfoLyrics() {
	const ctx = assertContext(SongInfoPageContext)

	const lyricsList = () => ctx.song.lyrics
	const langs = () => ctx.song.lyrics?.map((x) => x.language)
	const firstLangId = () => lyricsList()?.find((x) => x.is_main)?.language.id
	const langOptions = () => langs()?.map((lang) => lang.id.toString()) ?? []
	const getLangName = (value: string) =>
		langs()?.find((lang) => lang.id.toString() === value)?.name ?? value

	const [activeLang, setActiveLang] = createSignal<number | undefined>(
		firstLangId(),
	)
	const selectedLangId = () => activeLang() ?? firstLangId() ?? 0

	return (
		<div class="space-y-8 p-6">
			<label class="flex items-baseline gap-6">
				<span class="text-xs font-medium tracking-widest text-secondary uppercase">
					Language
				</span>
				<Select.Root<string>
					options={langOptions()}
					value={selectedLangId().toString()}
					onChange={(value) => {
						if (value === null) return
						setActiveLang(Number.parseInt(value, 10))
					}}
					itemComponent={(props) => (
						<Select.Item item={props.item}>
							{getLangName(props.item.rawValue)}
						</Select.Item>
					)}
				>
					<Select.Trigger
						aria-label="Language"
						class="h-auto min-h-8 border-0 border-b border-slate-400 rounded-none px-1 py-2 text-sm tracking-wide text-secondary focus:outline-none"
					>
						<Select.Value<string>>
							{(state) =>
								getLangName(
									state.selectedOption() ?? selectedLangId().toString(),
								)
							}
						</Select.Value>
						<Select.Icon />
					</Select.Trigger>
					<Select.Portal>
						<Select.Content>
							<Select.Listbox />
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			</label>

			<div>
				<div class="text-lg leading-relaxed font-light whitespace-pre-wrap text-secondary">
					{lyricsList()?.find((x) => x.language.id == activeLang())?.content}
				</div>
			</div>
		</div>
	)
}
