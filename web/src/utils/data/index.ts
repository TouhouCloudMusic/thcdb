const OK_TAG = 0
type OK_TAG = typeof OK_TAG
const ERROR_TAG = 1
type ERROR_TAG = typeof ERROR_TAG

export class Result<T, E> {
  private value: T | undefined
  private error: E | undefined
  private tag: typeof OK_TAG | typeof ERROR_TAG

  private constructor(tag: OK_TAG, val: T)
  private constructor(tag: ERROR_TAG, val: E)
  private constructor(tag: OK_TAG | ERROR_TAG, val: T | E) {
    if (tag === OK_TAG) {
      this.value = val as T
      this.error = undefined
      this.tag = OK_TAG
    } else {
      this.value = undefined
      this.error = val as E
      this.tag = ERROR_TAG
    }
  }

  public static ok<T, E>(val: T): Result<T, E> {
    return new Result<T, E>(OK_TAG, val)
  }

  public static err<T, E>(err: E): Result<T, E> {
    return new Result<T, E>(ERROR_TAG, err)
  }

  public static tryCatch<T>(fn: (...args: any[]) => T): Result<T, unknown> {
    try {
      return Result.ok(fn())
    } catch (e) {
      return Result.err(e)
    }
  }

  public map<U>(f: (t: T) => U): Result<U, E> {
    if (this.tag === OK_TAG) {
      // @ts-ignore
      this.value = f(this.value!)
    }
    return this as unknown as Result<U, E>
  }

  public match<U, F>(on_ok: (t: T) => U, on_err: (e: E) => F): Result<U, F> {
    if (this.tag === OK_TAG) {
      // @ts-ignore
      this.value = on_ok(this.value!)
    } else {
      // @ts-ignore
      this.error = on_err(this.error!)
    }
    return this as unknown as Result<U, F>
  }

  public unwrap(): T {
    if (this.tag === OK_TAG) {
      return this.value!
    } else {
      throw new Error(
        `called \`Result::unwrap()\` on an \`Err\` value: ${this.error}`,
      )
    }
  }

  public unwrapErr(): E {
    if (this.tag === ERROR_TAG) {
      return this.error!
    } else {
      throw new Error(
        `called \`Result::unwrap()\` on an \`Ok\` value: ${this.value}`,
      )
    }
  }
}
