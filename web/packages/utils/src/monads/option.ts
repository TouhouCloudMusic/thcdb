import type { Nilable } from "../type.ts"

export abstract class Option<T> {
	abstract isSome(): boolean

	abstract isNone(): boolean

	abstract map<U>(f: (value: T) => U): Option<U>

	abstract flatMap<U>(f: (value: T) => Option<U>): Option<U>

	abstract match<U, V>(onSome: (value: T) => U, onNone: () => V): U | V

	static some<T>(value: T): Option<T> {
		return new Some(value)
	}

	static none(): None {
		return new None()
	}

	static fromNullable<T>(value: Nilable<T>): Option<T> {
		return !value ? new None() : new Some(value)
	}
}

class Some<T> extends Option<T> {
	constructor(private value: T) {
		super()
	}

	isSome(): boolean {
		return true
	}

	isNone(): boolean {
		return false
	}

	map<U>(f: (value: T) => U): Option<U> {
		return new Some(f(this.value))
	}

	flatMap<U>(f: (value: T) => Option<U>): Option<U> {
		return f(this.value)
	}

	match<U, V>(onSome: (value: T) => U, onNone: () => V): U | V {
		return onSome(this.value)
	}
}

class None extends Option<never> {
	isSome(): boolean {
		return false
	}

	isNone(): boolean {
		return true
	}

	map<U>(_f: (value: never) => U): Option<U> {
		return this
	}

	flatMap<U>(_f: (value: never) => Option<U>): Option<U> {
		return this
	}

	match<U, V>(_: any, onNone: () => V): U | V {
		return onNone()
	}
}
