const currentYear = new Date().getFullYear()

export function transformYear(
	value: number | string,
	{ min = 0, max = currentYear } = {}
): string {
	// @ts-expect-error
	if (value < min) return min
	// @ts-expect-error
	if (value > max) return max
	// @ts-expect-error
	return value
}
