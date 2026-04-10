import { useQuery } from "@tanstack/solid-query"
import type { Tag } from "@thc/api"
import { TagQueryOption } from "@thc/query"
import { debounce } from "@thc/toolkit"
import type { Accessor } from "solid-js"
import { createMemo, createSignal } from "solid-js"

type TagFilter = ((tag: Tag) => boolean) | undefined

export function useTagSearch(dataFilter: Accessor<TagFilter>) {
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (value: string) => {
		setSearchKeyword(value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const tagsQuery = useQuery(() => ({
		...TagQueryOption.findByKeyword(searchTerm()!),
		placeholderData: (previous) => {
			const filter = dataFilter()

			return filter ? previous?.filter(filter) : previous
		},
		enabled: Boolean(searchTerm()),
	}))

	const items = createMemo(() => {
		const filter = dataFilter()
		const filteredTags = filter
			? tagsQuery.data?.filter(filter)
			: tagsQuery.data

		return filteredTags ?? []
	})

	return {
		searchKeyword,
		onInput,
		items,
		reset: () => setSearchKeyword(""),
	}
}
