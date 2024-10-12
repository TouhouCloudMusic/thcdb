export class IO<A> {
	constructor(private io: () => A) {}

	static of<A>(io: A): IO<A> {
		return new IO(() => io)
	}

	map<B>(this: IO<A>, f: (value: A) => B): IO<B> {
		return new IO(() => f(this.io()))
	}

	flatMap<B>(f: (value: A) => IO<B>): IO<B> {
		return f(this.io())
	}

	run(): A {
		return this.io()
	}
}
