export const enum ResultTag {
	Ok,
	Err,
}

export interface Ok<T> extends Result<T> {
	readonly value: T
	readonly tag: ResultTag.Ok
}

export interface Err<E> extends Result<unknown, E> {
	readonly value: undefined
	readonly tag: ResultTag.Err
	readonly error: E
}

export class Result<T, E = unknown> {
	private constructor(
		private $tag: ResultTag,
		private $value?: T,
		private $error?: E,
	) {}
	static Ok<T, E = unknown>(value: T): Result<T, E> {
		return new Result<T, E>(ResultTag.Ok, value)
	}

	static Err<T, E>(error: E): Result<T, E> {
		return new Result(ResultTag.Err, undefined as T, error)
	}

	get value(): T | undefined {
		return this.$value
	}
	get tag(): ResultTag {
		return this.$tag
	}
	isOk(): this is Ok<T> {
		return this.$tag === ResultTag.Ok
	}
	isErr(): this is Err<E> {
		return this.$tag === ResultTag.Err
	}
	unwrap(): T {
		if (import.meta.env.DEV) {
			if (this.isOk()) return this.value as T
			else
				throw new Error(
					`Unwrap a Ok on an ${this.isErr() ? "Err" : "unknown"} value`,
				)
		} else return this.$value as T
	}
	unwrapErr(): E {
		if (import.meta.env.DEV) {
			if (this.isErr()) return this.$error as E
			else
				throw new Error(
					`Unwrap an Err on a ${this.isOk() ? "Ok" : "unknown"} value`,
				)
		} else return this.$error as E
	}
}
