// export const INVALID_PARMAS_ERROR = Symbol("invalid_params")
// export const NOT_FOUND_ERROR = Symbol("not_found")

class AutoNamingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
export class InvalidParamError extends AutoNamingError {
  constructor(readonly param: string) {
    super(`Invalid parameter: ${param}`)
  }
}

export class NotFoundError extends AutoNamingError {
  constructor(readonly target?: string) {
    super(target ? `${target} not found` : "not found")
  }
}
export class NotImplementedError extends AutoNamingError {
  constructor(readonly msg?: string) {
    super(msg ?? "not implemented")
  }
}
