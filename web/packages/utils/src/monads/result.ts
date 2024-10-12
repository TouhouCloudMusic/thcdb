export abstract class Result<T, E> {
	abstract isOk(): boolean
	abstract isErr(): boolean
	abstract map<U>(f: (value: T) => U): Result<U, E>
	abstract flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E>
	abstract mapErr<F>(f: (error: E) => F): Result<T, F>
	abstract flatMapErr<F>(f: (error: E) => Result<T, F>): Result<T, F>
	abstract match<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): U | F
	static ok<const T>(value: T): Result<T, never> {
		return new Ok(value)
	}
	static err<const E>(error: E): Result<never, E> {
		return new Err(error)
	}
}

class Ok<T, E = never> extends Result<T, E> {
	constructor(private value: T) {
		super()
	}
	isOk(): true {
		return true
	}
	isErr(): false {
		return false
	}
	map<U>(f: (value: T) => U): Result<U, E> {
		return new Ok(f(this.value))
	}
	flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E> {
		return f(this.value)
	}

	mapErr<F>(f: (error: E) => F): Result<T, F> {
		return this as unknown as Result<T, F>
	}

	flatMapErr<F>(f: (error: E) => Result<T, F>): Result<T, F> {
		return this as unknown as Result<T, F>
	}

	match<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): U | F {
		return onOk(this.value)
	}
}

class Err<E, T = never> extends Result<T, E> {
	constructor(private error: E) {
		super()
	}
	isOk(): false {
		return false
	}
	isErr(): true {
		return true
	}
	map<U>(f: (value: T) => U): Result<U, E> {
		return this as unknown as Result<U, E>
	}
	flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E> {
		return this as unknown as Result<U, E>
	}

	mapErr<F>(f: (error: E) => F): Result<T, F> {
		return new Err(f(this.error))
	}

	flatMapErr<F>(f: (error: E) => Result<T, F>): Result<T, F> {
		return f(this.error)
	}

	match<F>(_onOk: any, onErr: (error: E) => F): F {
		return onErr(this.error)
	}
}
