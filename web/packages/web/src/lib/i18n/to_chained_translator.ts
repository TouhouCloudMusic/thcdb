import * as i18n from "@solid-primitives/i18n"

export function toChainedTranslator<T extends i18n.BaseRecordDict>(
	dict: () => T
) {
	return i18n.chainedTranslator(
		dict(),
		i18n.translator(() => i18n.flatten(dict()), i18n.resolveTemplate)
	)
}
