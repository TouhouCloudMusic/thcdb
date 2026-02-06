import type { nil } from "~/type"

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

	if (precision === Precision.Min) {
		return (hours * 60 + minutes).toString()
	}

	const mm = minutes.toString().padStart(2, "0")
	const ss = seconds.toString().padStart(2, "0")

	let buf = hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`

	if (precision === Precision.Milli) {
		buf += `.${ms.toString().padStart(3, "0")}`
	}

	return buf
}
