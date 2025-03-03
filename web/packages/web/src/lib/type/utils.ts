export type SafePick<T, K extends keyof T> = {
  [P in K]: T[P]
}

export type SafeOmit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}
