export type SafePick<T extends object, K extends PropertyKey> = Pick<
	T,
	K extends keyof T ? K : never
>
