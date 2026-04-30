const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

export function formatTimestamp(
	value: string | null | undefined,
	noneLabel = "None",
) {
	if (!value) return noneLabel
	const date = new Date(value)
	if (Number.isNaN(date.valueOf())) return value
	return DATE_TIME_FORMAT.format(date)
}
