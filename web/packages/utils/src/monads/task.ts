export class Task<A> {
  constructor(protected task: () => Promise<A>) {}

  static of<A>(task: A): Task<A> {
    return new Task(() => Promise.resolve(task))
  }
  static fromPromise<A>(task: () => Promise<A>): Task<A> {
    return new Task(task)
  }
  map<B>(f: (value: A) => B): Task<B> {
    return new Task(() => Promise.resolve().then(this.task).then(f))
  }

  flatMap<U extends Task<unknown>>(f: (value: A) => U): U {
    return new Task(() =>
      Promise.resolve()
        .then(this.task)
        .then((x) => f(x).run()),
    ) as U
  }

  run(): Promise<A> {
    return this.task()
  }
}

const a = Task.of(1).map((x) => x + 1)

console.log(await a.run())
