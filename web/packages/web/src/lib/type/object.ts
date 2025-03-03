export type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false
export type KeyOf<T> = T extends Record<PropertyKey, unknown> ? keyof T : never

export type ValueOf<T, K extends PropertyKey> =
  T extends Record<PropertyKey, unknown> ? T[K] : never
