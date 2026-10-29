/* @refresh skip */
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { createSignal } from "solid-js"

import { Select, underlineSelectStyles } from "~/component/atomic/form/select"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

const styles = stylex.create({
	lyrics: {
		padding: px[24],
	},
	languageField: {
		marginBlockStart: 0,
		marginBlockEnd: px[32],
		display: "flex",
		flexDirection: "row",
		alignItems: "baseline",
		gap: px[24],
	},
	label: {
		marginBottom: 0,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.1em",
		color: colors.textSecondary,
		textTransform: "uppercase",
	},
	text: {
		fontSize: fontSizes.lg,
		lineHeight: 1.625,
		fontWeight: 300,
		whiteSpace: "pre-wrap",
		color: colors.textSecondary,
	},
})

export function SongInfoLyrics() {
	const { t } = useLingui()
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
		<div {...stylex.attrs(styles.lyrics)}>
			<Select.Root<string>
				styles={styles.languageField}
				options={langOptions()}
				optionTextValue={getLangName}
				value={selectedLangId().toString()}
				onChange={(value) => {
					if (value === undefined) return
					setActiveLang(Number.parseInt(value, 10))
				}}
				itemComponent={(option) => (
					<Select.Item
						item={option.item}
						styles={underlineSelectStyles.item}
					>
						{getLangName(option.item.rawValue)}
					</Select.Item>
				)}
			>
				<Select.Label styles={styles.label}>{"Language"}</Select.Label>
				<Select.Trigger
					styles={underlineSelectStyles.trigger}
					aria-label={t`Language`}
				/>
				<Select.Content styles={underlineSelectStyles.content}>
					<Select.Listbox styles={underlineSelectStyles.listbox} />
				</Select.Content>
			</Select.Root>

			<div>
				<div {...stylex.attrs(styles.text)}>
					{lyricsList()?.find((x) => x.language.id == activeLang())?.content}
				</div>
			</div>
		</div>
	)
}
