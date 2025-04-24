export * from "./data"
export * from "./control_flow"

export type Id<T> = T
export type PartialEq<A, B> = A extends B ? true : false
export type Eq<A, B> = PartialEq<A, B> & PartialEq<B, A>

export interface TypeError<T extends string> {
	readonly __typeError__: T
}
