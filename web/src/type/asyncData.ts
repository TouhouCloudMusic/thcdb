export type AsyncData<Data, Failure extends object> =
	| { kind: "loading"; data?: never }
	| ({ kind: "error" } & Failure)
	| { kind: "ready"; data: Data }

export function ready<Data>(data: Data) {
	return { kind: "ready" as const, data }
}
