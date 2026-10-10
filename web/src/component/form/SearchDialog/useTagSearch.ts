import { useQuery } from "@tanstack/solid-query"
import type { Tag } from "@thc/api"
import { TagQueryOption } from "@thc/query"
import { debounce } from "@thc/toolkit"
import type { Accessor } from "solid-js"
import { createMemo, createSignal } from "solid-js"

type TagFilter = ((tag: Tag) => boolean) | undefined

export function useTagSearch(filter: Accessor<TagFilter>) {
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
			const pred = filter()

			return pred ? previous?.filter(pred) : previous
		},
		enabled: Boolean(searchTerm()),
	}))

	const items = createMemo(() => {
		const tagFilter = filter()
		const filteredTags = tagFilter
			? tagsQuery.data?.filter(tagFilter)
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
