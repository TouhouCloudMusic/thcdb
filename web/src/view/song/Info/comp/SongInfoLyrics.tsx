/* @refresh skip */
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { createSignal } from "solid-js"

import { Select } from "~/component/atomic/form/select"
import { palette } from "~/style/color/palette.stylex"
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
		alignItems: "baseline",
		gap: px[24],
	},
	label: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.1em",
		color: colors.textSecondary,
		textTransform: "uppercase",
	},
	languageTrigger: {
		height: "auto",
		minHeight: px[32],
		borderWidth: 0,
		borderStyle: "solid",
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderColor: {
			default: palette.slate[400],
			':is([aria-invalid="true"])': palette.reimu[600],
		},
		borderRadius: 0,
		paddingInline: px[4],
		paddingBlock: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		letterSpacing: "0.025em",
		color: { default: colors.textSecondary, ":disabled": palette.slate[400] },
		outlineStyle: {
			default: "solid",
			":focus": "none",
		},
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
			<label {...stylex.attrs(styles.languageField)}>
				<span {...stylex.attrs(styles.label)}>Language</span>
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
						aria-label={t`Language`}
						styles={[styles.languageTrigger]}
					>
						<Select.Value<string>>
							{(state) => getLangName(state.selectedOption())}
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
				<div {...stylex.attrs(styles.text)}>
					{lyricsList()?.find((x) => x.language.id == activeLang())?.content}
				</div>
			</div>
		</div>
	)
}
