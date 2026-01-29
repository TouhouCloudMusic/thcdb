export function clamp(lower: number, upper: number, value: number): number
export function clamp(lower: number, upper: number): (value: number) => number
export function clamp(lower: number, upper: number, value?: number) {
	return value === undefined
		? (v: number) => Math.min(Math.max(v, lower), upper)
		: Math.min(Math.max(value, lower), upper)
}
