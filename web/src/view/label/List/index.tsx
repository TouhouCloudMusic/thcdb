import { useQuery } from "@tanstack/solid-query"
import type { Label } from "@thc/api"
import { LabelQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createMemo, createSignal, For, Show } from "solid-js"

import { Input } from "~/component/atomic/Input"
import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"

export function LabelListPage() {
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (e: Event) => {
		setSearchKeyword((e.target as HTMLInputElement).value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const labelsQuery = useQuery(() => ({
		...LabelQueryOption.findByKeyword(searchTerm()!),
		placeholderData: id,
		enabled: Boolean(searchTerm()),
	}))

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-y-6">
				<div class="flex items-center justify-between gap-4">
					<h1 class="text-2xl font-light tracking-tight">Labels</h1>
					<Link to="/label/new">
						<Button variant="Primary">Create Label</Button>
					</Link>
				</div>

				<div class="flex items-center gap-3">
					<Input
						placeholder="Search label..."
						value={searchKeyword()}
						onInput={onInput}
						class="h-9 w-full max-w-md"
					/>
				</div>

				<Show
					when={searchTerm()}
					fallback={
						<div class="text-sm text-tertiary">
							Type at least 2 characters to search.
						</div>
					}
				>
					<Show when={labelsQuery.data}>
						<ul class="divide-y divide-slate-300 overflow-hidden rounded-md border border-slate-300">
							<For
								each={labelsQuery.data}
								fallback={<li class="p-4 text-sm text-tertiary">No results</li>}
							>
								{(label) => <LabelListItem label={label} />}
							</For>
						</ul>
					</Show>
				</Show>
			</div>
		</PageLayout>
	)
}

type ItemProps = {
	label: Label
}

function LabelListItem(props: ItemProps) {
	let founded = () => DateWithPrecision.display(props.label.founded_date)
	let dissolved = () => DateWithPrecision.display(props.label.dissolved_date)
	let hasDates = () => Boolean(founded() || dissolved())

	return (
		<li class="flex items-center justify-between gap-4 p-4">
			<Link
				to="/label/$id"
				params={{ id: props.label.id.toString() }}
				class="text-lg font-light"
			>
				{props.label.name}
			</Link>
			<Show when={hasDates()}>
				<div class="text-xs text-tertiary">
					<Show when={founded()}>
						<span>{founded()}</span>
					</Show>
					<Show when={dissolved()}>
						<span class="whitespace-pre"> - </span>
						<span>{dissolved()}</span>
					</Show>
				</div>
			</Show>
		</li>
	)
}
