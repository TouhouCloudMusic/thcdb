export function fromYMD(year: number, month: number, day: number): Date {
	const date = new Date(Date.UTC(year, month - 1, day))
	date.setUTCFullYear(year)
	return date
}
