import { t } from "@lingui/core/macro"

const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

export function formatTimestamp(value?: string | null) {
	if (!value) return t`None`
	const date = new Date(value)
	if (Number.isNaN(date.valueOf())) return value
	return DATE_TIME_FORMAT.format(date)
}
