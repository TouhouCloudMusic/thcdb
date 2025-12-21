import { For, type Component, createMemo } from "solid-js"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"

const PAGINATER_CLASS = "inline-flex items-center gap-2"
const ITEM_BASE_CLASS = tw(`
	inline-flex
	items-center
	justify-center
	rounded-md
	tabular-nums
	disabled:cursor-not-allowed
	disabled:opacity-40
`)

// 所有分页按钮保持正方形 + 固定尺寸，避免页码位数变化导致整体宽度抖动
const SQUARE_ITEM_CLASS = tw(`
	${ITEM_BASE_CLASS}
	size-9
	hover:bg-secondary
	disabled:hover:bg-transparent

	data-current:bg-slate-900
	data-current:hover:bg-slate-900
	data-current:text-(--background-color-primary)
	data-current:active:bg-slate-800
	data-current:disabled:bg-slate-800
`)

type PaginationProps = {
	current: number
	onPageChange: (page: number) => void
	total: number
	nearbyCount?: number
	class?: string
}

const buildNearbyPages = (
	current: number,
	total: number,
	nearbyCount: number,
) => {
	if (total <= 0) return []

	const count = Math.max(1, Math.floor(nearbyCount))
	const half = Math.floor(count / 2)

	let start = current - half
	let end = start + count - 1

	if (start < 1) {
		start = 1
		end = Math.min(total, start + count - 1)
	}

	if (end > total) {
		end = total
		start = Math.max(1, end - count + 1)
	}

	const pages: number[] = []
	for (let p = start; p <= end; p++) pages.push(p)
	return pages
}

export const Pagination: Component<PaginationProps> = (props) => {
	const paginaterClass = () => twMerge(PAGINATER_CLASS, props.class)

	const nearbyCount = () => props.nearbyCount ?? 7
	const pages = createMemo(() =>
		buildNearbyPages(props.current, props.total, nearbyCount()),
	)

	const canPrev = () => props.current > 1
	const canNext = () => props.current < props.total

	return (
		<nav
			class={paginaterClass()}
			aria-label="Pagination"
		>
			<button
				type="button"
				class={SQUARE_ITEM_CLASS}
				onClick={() => props.onPageChange(1)}
				disabled={!canPrev()}
				aria-label="First page"
			>
				{"<<"}
			</button>

			<button
				type="button"
				class={SQUARE_ITEM_CLASS}
				onClick={() => props.onPageChange(props.current - 1)}
				disabled={!canPrev()}
				aria-label="Previous page"
			>
				{"<"}
			</button>

			<For each={pages()}>
				{(page) => (
					<button
						type="button"
						class={SQUARE_ITEM_CLASS}
						onClick={() => props.onPageChange(page)}
						data-current={page === props.current ? "" : undefined}
						aria-current={page === props.current ? "page" : undefined}
					>
						{page}
					</button>
				)}
			</For>

			<button
				type="button"
				class={SQUARE_ITEM_CLASS}
				onClick={() => props.onPageChange(props.current + 1)}
				disabled={!canNext()}
				aria-label="Next page"
			>
				{">"}
			</button>

			<button
				type="button"
				class={SQUARE_ITEM_CLASS}
				onClick={() => props.onPageChange(props.total)}
				disabled={!canNext()}
				aria-label="Last page"
			>
				{">>"}
			</button>
		</nav>
	)
}
