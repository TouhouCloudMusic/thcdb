import { type SetStoreFunction, type Store } from "solid-js/store"

export type $Store<T> = [Store<T>, SetStoreFunction<T>]
