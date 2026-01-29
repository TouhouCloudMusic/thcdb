export function toFinite(value: number | undefined) {
	return Number.isFinite(value) ? value : undefined
}
