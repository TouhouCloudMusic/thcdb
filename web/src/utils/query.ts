type DataPageResponse = {
	data: {
		page: number
		total_pages: number
	}
}

export function getNextPageParam(last: DataPageResponse) {
	return last.data.page < last.data.total_pages ? last.data.page + 1 : undefined
}
