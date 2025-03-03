import { Result } from "./result.ts"
import { Task } from "./task.ts"

export class TaskEither<T, E> {
  constructor(protected task: () => Promise<Result<T, E>>) {}

  static tryCatch<T, E>(task: () => Promise<Result<T, E>>): TaskEither<E, T> {
    return new TaskEither(async () => {
      try {
        return Result.ok(task())
      } catch (error) {
        return Result.err(error)
      }
    })
  }
  // static fromPromise<R>(task: () => Promise<R>): TaskEither<unknown, R> {
  // 	return new TaskEither(task)
  // }

  // tryCatch(task: () => Promise<R>): TaskEither<L, R> {
  // 	try {
  // 		return TaskEither.fromPromise(async () => Result.ok(await task()))
  // 	} catch (e) {
  // 		return TaskEither.of(Result.err(e))
  // 	}
  // }
}
