import * as stylex from "@stylexjs/stylex"

import { Select } from "~/component/atomic/form/select"
import type { AppLocale } from "~/state/i18n"
import { useI18N } from "~/state/i18n"
import { px } from "~/style/tokens.stylex"

const styles = stylex.create({
	trigger: { width: "100%", marginRight: px[8], height: px[32] },
})

type LocaleOption = {
	label: string
	value: AppLocale
}

const LOCALE_OPTIONS = {
	en: {
		label: "English",
		value: "en",
	},
	"zh-CN": {
		label: "简体中文",
		value: "zh-CN",
	},
} satisfies Record<AppLocale, LocaleOption>

const LOCALE_OPTION_LIST = Object.values(LOCALE_OPTIONS)

export function LocaleSelect() {
	const i18n = useI18N()

	return (
		<Select.Root
			options={LOCALE_OPTION_LIST}
			optionTextValue="label"
			optionValue="value"
			value={LOCALE_OPTIONS[i18n.locale()]}
			disabled={i18n.isSwitchingLocale()}
			onChange={(option) => {
				if (option === undefined) return
				void i18n.setLocale(option.value)
			}}
		>
			<Select.Trigger styles={styles.trigger} />
			<Select.Content />
		</Select.Root>
	)
}
