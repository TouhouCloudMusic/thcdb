// oxlint-disable no-non-null-asserted-nullish-coalescing
export * as ObjExt from "./object"
export * as StrExt from "./string"
export * as MapExt from "./map"
export * as ArrExt from "./array"
export { pick } from "./object"

export function any(...args: boolean[]): boolean {
	switch (args.length) {
		case 0: {
			return false
		}
		case 1: {
			return args[0]!
		}
		case 2: {
			return args[0]! || args[1]!
		}
		case 3: {
			return args[0]! || args[1]! || args[2]!
		}
		case 4: {
			return args[0]! || args[1]! || args[2]! || args[3]!
		}
		case 5: {
			return args[0]! || args[1]! || args[2]! || args[3]! || args[4]!
		}
		case 6: {
			return (
				args[0]! || args[1]! || args[2]! || args[3]! || args[4]! || args[5]!
			)
		}
		default: {
			for (const arg of args) {
				if (arg) return true
			}
			return false
		}
	}
}

export function all(...args: boolean[]): boolean {
	switch (args.length) {
		case 0: {
			return true
		}
		case 1: {
			return args[0]!
		}
		case 2: {
			return args[0]! && args[1]!
		}
		case 3: {
			return args[0]! && args[1]! && args[2]!
		}
		case 4: {
			return args[0]! && args[1]! && args[2]! && args[3]!
		}
		case 5: {
			return args[0]! && args[1]! && args[2]! && args[3]! && args[4]!
		}
		case 6: {
			return (
				args[0]! && args[1]! && args[2]! && args[3]! && args[4]! && args[5]!
			)
		}
		default: {
			for (const arg of args) {
				if (!arg) return false
			}
			return true
		}
	}
}
