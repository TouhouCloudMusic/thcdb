import type { Tag } from "@thc/api"
import { Show, Suspense } from "solid-js"

import { Link, Tab } from "~/component/atomic"
import { Intersperse } from "~/component/data/Intersperse"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { CorrectionHistorySection } from "~/view/correction/Detail"

import { TagInfoPageContext } from "./context"
import type { TagInfoPageContextValue } from "./context"

type Props = {
	tag: Tag
}

export function TagInfoPage(props: Props) {
	const contextValue: TagInfoPageContextValue = {
		get tag() {
			return props.tag
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>Loading...</div>}>
				<TagInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-y-6">
						<TagInfoHeader />
						<TagInfoDetails />
						<TagInfoTabs />
						<CorrectionHistorySection
							entityType="tag"
							entityId={props.tag.id}
						/>
					</div>
				</TagInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

function TagInfoHeader() {
	const ctx = assertContext(TagInfoPageContext)
	return (
		<header class="space-y-2">
			<h1 class="text-3xl leading-tight font-light tracking-tight text-primary">
				{ctx.tag.name}
			</h1>
			<Show when={ctx.tag.short_description}>
				<p class="text-base font-light tracking-wide text-tertiary">
					{ctx.tag.short_description}
				</p>
			</Show>
		</header>
	)
}

function TagInfoDetails() {
	const ctx = assertContext(TagInfoPageContext)
	return (
		<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
			<div class="text-tertiary">Type</div>
			<div>{ctx.tag.type}</div>
			<Show when={ctx.tag.alt_names && ctx.tag.alt_names.length > 0}>
				<span class="text-tertiary">AKAs</span>
				<ul class="flex flex-wrap whitespace-pre">
					<Intersperse
						of={ctx.tag.alt_names!}
						with={<span>, </span>}
					>
						{(x) => <li class="text-secondary">{x.name}</li>}
					</Intersperse>
				</ul>
			</Show>
		</div>
	)
}

const TRIGGER_CLASS = "py-4"
function TagInfoTabs() {
	const ctx = assertContext(TagInfoPageContext)
	let hasDesc = () => Boolean(ctx.tag.description)
	let hasRelations = () =>
		Boolean(ctx.tag.relations && ctx.tag.relations.length > 0)
	return (
		<Tab.Root>
			<div class="border-b border-slate-300 px-4">
				<Tab.List class="grid-cols-2 gap-12">
					<Show when={hasDesc()}>
						<Tab.Trigger
							value="Description"
							class={TRIGGER_CLASS}
						>
							Description
						</Tab.Trigger>
					</Show>
					<Show when={hasRelations()}>
						<Tab.Trigger
							value="Relations"
							class={TRIGGER_CLASS}
						>
							Relations
						</Tab.Trigger>
					</Show>
					<Tab.Indicator />
				</Tab.List>
			</div>
			<Show when={hasDesc()}>
				<Tab.Content
					value="Description"
					class="p-4"
				>
					<TagInfoDescription />
				</Tab.Content>
			</Show>
			<Show when={hasRelations()}>
				<Tab.Content
					value="Relations"
					class="p-4"
				>
					<TagInfoRelations />
				</Tab.Content>
			</Show>
		</Tab.Root>
	)
}

function TagInfoDescription() {
	const ctx = assertContext(TagInfoPageContext)
	return (
		<div class="p-2">
			<p class="text-base leading-relaxed font-light whitespace-pre-wrap text-secondary">
				{ctx.tag.description}
			</p>
		</div>
	)
}

function TagInfoRelations() {
	const ctx = assertContext(TagInfoPageContext)
	let list = () => ctx.tag.relations ?? []
	return (
		<div class="space-y-4">
			<ul class="divide-y divide-slate-300 overflow-hidden rounded-md border border-slate-300">
				{list().map((rel) => (
					<li class="grid grid-cols-[1fr_auto] items-center gap-4 p-4">
						<div class="flex flex-col">
							<Link
								to="/tag/$id"
								params={{ id: rel.tag.id.toString() }}
							>
								{rel.tag.name}
							</Link>
							<span class="text-xs text-tertiary">{rel.tag.type}</span>
						</div>
						<span class="text-sm text-secondary">{rel.type}</span>
					</li>
				))}
			</ul>
		</div>
	)
}
