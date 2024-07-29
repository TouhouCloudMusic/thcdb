export type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false
