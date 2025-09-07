import type { nil } from "~/types"

type Duration = number
export const enum Precision {
	Min,
	Sec,
	Milli,
}

export type FormatOption = {
	precision?: Precision
}

export function format(duration: Duration | nil, option?: FormatOption) {
	if (duration == undefined) return

	const totalMilliseconds = Math.max(0, Math.floor(duration))
	const totalSeconds = Math.floor(totalMilliseconds / 1000)
	const ms = totalMilliseconds % 1000

	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	const precision = option?.precision ?? Precision.Sec

	if (precision === Precision.Milli) {
		const secStr =
			seconds.toString().padStart(2, "0") + "." + ms.toString().padStart(3, "0")
		if (hours > 0) {
			const minStr = minutes.toString().padStart(2, "0")
			return `${hours}:${minStr}:${secStr}`
		}
		return `${minutes}:${secStr}`
	}

	// seconds precision (default) or minutes precision
	if (precision === Precision.Min) {
		// For minutes precision, drop seconds and milliseconds.
		if (hours > 0) {
			const minStr = minutes.toString().padStart(2, "0")
			return `${hours}:${minStr}`
		}
		return `${minutes}`
	}

	// default: seconds precision
	const secStr = seconds.toString().padStart(2, "0")
	if (hours > 0) {
		const minStr = minutes.toString().padStart(2, "0")
		return `${hours}:${minStr}:${secStr}`
	} else {
		return `${minutes}:${secStr}`
	}
}
