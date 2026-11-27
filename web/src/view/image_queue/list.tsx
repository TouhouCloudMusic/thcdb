import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { createMemo, For, Match, Show, Switch } from "solid-js"
import type { JSX } from "solid-js"
import { Dynamic } from "solid-js/web"

import { Button } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"
import type {
	InfiniteQueryPagination,
	InfiniteQueryState,
} from "~/utils/adapter/tanstack/infiniteQueryState"
import { createInfiniteScroll } from "~/utils/solid/createInfiniteScroll"

import { ImageQueueListSkeleton } from "./listRow"

const feedbackStyles = stylex.create({
	message: {
		display: "block",
		paddingBlock: px[24],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	error: { color: palette.reimu[700] },
	retry: { marginInlineStart: px[8] },
})

function ListError(props: { message: string; retry: () => void }) {
	const { t } = useLingui()

	return (
		<div {...stylex.attrs(feedbackStyles.message)}>
			<output {...stylex.attrs(feedbackStyles.error)}>{props.message}</output>
			<Button
				size="sm"
				styles={feedbackStyles.retry}
				onClick={() => props.retry()}
			>
				{t`Retry`}
			</Button>
		</div>
	)
}

const paginationStyles = stylex.create({
	sentinel: { height: px[4] },
})

function PaginationFooter(props: { pagination: InfiniteQueryPagination }) {
	const { t } = useLingui()
	const more = () => {
		const pagination = props.pagination
		return pagination.kind === "more" ? pagination : undefined
	}
	const paginationError = () => {
		const pagination = props.pagination
		return pagination.kind === "fetch-next-error"
			|| pagination.kind === "refresh-error"
			? pagination
			: undefined
	}
	const setSentinelRef = createInfiniteScroll({
		enabled: () => more() !== undefined,
		onLoadMore: () => more()?.load(),
	})

	return (
		<Switch>
			<Match when={more()}>
				<div
					ref={setSentinelRef}
					{...stylex.attrs(paginationStyles.sentinel)}
				></div>
			</Match>
			<Match when={paginationError()}>
				{(failure) => (
					<ListError
						message={
							failure().kind === "fetch-next-error"
								? t`Failed to load more entries.`
								: t`Failed to refresh entries.`
						}
						retry={failure().retry}
					/>
				)}
			</Match>
			<Match when={props.pagination.kind === "end"}>
				<p {...stylex.attrs(feedbackStyles.message)}>{t`No more entries`}</p>
			</Match>
		</Switch>
	)
}

const listStyles = stylex.create({
	list: {
		display: "grid",
		columnGap: px[8],
		margin: 0,
		padding: 0,
	},
})

const INITIAL_SKELETONS = Array.from({ length: 20 })
const APPENDED_SKELETONS = Array.from({ length: 3 })

type ListContent<Item> =
	| Exclude<InfiniteQueryState<Item>, { kind: "ready" }>
	| { kind: "empty" }
	| { kind: "rows"; items: Item[]; pagination: InfiniteQueryPagination }

function listContent<Item>(state: InfiniteQueryState<Item>): ListContent<Item> {
	if (state.kind !== "ready") return state
	const { items, pagination } = state.data
	if (items.length === 0 && pagination.kind === "end") return { kind: "empty" }
	return { kind: "rows", items, pagination }
}

type ImageQueueListProps<Item> = {
	as: "ul" | "ol"
	styles: StyleXStyles
	state: InfiniteQueryState<Item>
	emptyMessage: string
	errorMessage: string
	children: (item: Item) => JSX.Element
}

export function ImageQueueList<Item>(props: ImageQueueListProps<Item>) {
	const layout = () => stylex.attrs(listStyles.list, props.styles)
	const content = createMemo(() => listContent(props.state))

	return (
		<div
			aria-busy={(() => {
				const view = content()
				return (
					view.kind === "loading"
					|| (view.kind === "rows" && view.pagination.kind === "fetching")
				)
			})()}
		>
			<Switch>
				<Match when={content().kind === "loading"}>
					<Dynamic
						component={props.as}
						aria-hidden="true"
						{...layout()}
					>
						<For each={INITIAL_SKELETONS}>
							{() => <ImageQueueListSkeleton />}
						</For>
					</Dynamic>
				</Match>
				<Match
					when={(() => {
						const view = content()
						return view.kind === "error" ? view : undefined
					})()}
				>
					{(failure) => (
						<ListError
							message={props.errorMessage}
							retry={failure().retry}
						/>
					)}
				</Match>
				<Match when={content().kind === "empty"}>
					<output {...stylex.attrs(feedbackStyles.message)}>
						{props.emptyMessage}
					</output>
				</Match>
				<Match
					when={(() => {
						const view = content()
						return view.kind === "rows" ? view : undefined
					})()}
				>
					{(rows) => (
						<>
							<Dynamic
								component={props.as}
								{...layout()}
							>
								<For each={rows().items}>{props.children}</For>
								<Show when={rows().pagination.kind === "fetching"}>
									<For each={APPENDED_SKELETONS}>
										{() => <ImageQueueListSkeleton />}
									</For>
								</Show>
							</Dynamic>
							<PaginationFooter pagination={rows().pagination} />
						</>
					)}
				</Match>
			</Switch>
		</div>
	)
}
