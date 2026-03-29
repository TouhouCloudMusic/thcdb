import { Select } from "~/component/atomic/form/select"
import type { AppLocale } from "~/state/i18n"
import { useI18N } from "~/state/i18n"

type LocaleOption = {
	label: string
	value: AppLocale
}

const LOCALE_OPTIONS = {
	en: {
		label: "English",
		value: "en",
	},
	"zh-Hans": {
		label: "简体中文",
		value: "zh-Hans",
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
			onChange={(option) => {
				if (option === null) return
				void i18n.setLocale(option.value)
			}}
			itemComponent={(optionProps) => (
				<Select.Item item={optionProps.item}>
					{optionProps.item.rawValue.label}
				</Select.Item>
			)}
		>
			<Select.Trigger
				class="w-full mr-2 h-8"
				disabled={i18n.isSwitchingLocale()}
			>
				<Select.Value<LocaleOption>>
					{(state) => state.selectedOption().label}
				</Select.Value>
				<Select.Icon />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content>
					<Select.Listbox />
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	)
}
