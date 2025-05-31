export type InfiniteQuery<T> = {
	data: T[]
	hasNext: boolean
	next(): Promise<void>
	isLoading: boolean
}
