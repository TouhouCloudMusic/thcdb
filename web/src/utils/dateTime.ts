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

const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>()

function formatRelativeUnit(
	locale: string,
	value: number,
	unit: Intl.RelativeTimeFormatUnit,
): string {
	let formatter = relativeTimeFormatters.get(locale)
	if (formatter === undefined) {
		formatter = new Intl.RelativeTimeFormat(locale)
		relativeTimeFormatters.set(locale, formatter)
	}
	return formatter.format(value, unit)
}

export function formatRelativeTime(
	value: string | null | undefined,
	nowMs: number,
	locale: string,
	justNowLabel: string,
): string {
	if (!value) return justNowLabel
	const date = new Date(value)
	if (Number.isNaN(date.valueOf())) return value
	const elapsedMs = nowMs - date.getTime()
	if (elapsedMs < 60_000) return justNowLabel
	if (elapsedMs < 3_600_000) {
		return formatRelativeUnit(locale, -Math.floor(elapsedMs / 60_000), "minute")
	}
	if (elapsedMs < 86_400_000) {
		return formatRelativeUnit(
			locale,
			-Math.floor(elapsedMs / 3_600_000),
			"hour",
		)
	}
	if (elapsedMs < 604_800_000) {
		return formatRelativeUnit(
			locale,
			-Math.floor(elapsedMs / 86_400_000),
			"day",
		)
	}
	const sameYear = date.getFullYear() === new Date(nowMs).getFullYear()
	return new Intl.DateTimeFormat(
		locale,
		sameYear
			? { month: "short", day: "numeric" }
			: { year: "numeric", month: "short", day: "numeric" },
	).format(date)
}
