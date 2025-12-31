import type { Event } from "@thc/api"
import { Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { CorrectionHistorySection } from "~/view/correction/Detail"

import { EventInfoPageContext } from "./context"
import type { EventInfoPageContextValue } from "./context"

type EventInfoPageProps = {
	event: Event
}

export function EventInfoPage(props: EventInfoPageProps) {
	const contextValue: EventInfoPageContextValue = {
		get event() {
			return props.event
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>Loading...</div>}>
				<EventInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-y-6">
						<EventInfoHeader />
						<EventInfoTabs />
						<CorrectionHistorySection
							entityType="event"
							entityId={props.event.id}
						/>
					</div>
				</EventInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

function EventInfoHeader() {
	const ctx = assertContext(EventInfoPageContext)

	let alternativeNames = () => ctx.event.alternative_names ?? []
	let hasAlternativeNames = () => alternativeNames().length > 0
	return (
		<>
			<header class="space-y-2">
				<h1 class="text-3xl leading-tight font-light tracking-tight text-primary">
					{ctx.event.name}
				</h1>
				<p class="tracking-wide text-tertiary">
					{ctx.event.short_description ?? "Short description is not provided"}
				</p>
			</header>
			<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
				<span class="text-tertiary">Date</span>

				<Show
					when={ctx.event.start_date}
					fallback={<span>N/A</span>}
				>
					<div>
						<span>{DateWithPrecision.display(ctx.event.start_date)}</span>
						<Show when={ctx.event.end_date}>
							<span class="whitespace-pre text-tertiary"> - </span>
							<span>{DateWithPrecision.display(ctx.event.end_date)}</span>
						</Show>
					</div>
				</Show>
				<Show when={hasAlternativeNames()}>
					<span class="text-tertiary">AKAs</span>
					<ul class="flex flex-wrap gap-0.5 whitespace-pre">
						<Intersperse
							of={alternativeNames()}
							with={<span class="whitespace-pre">, </span>}
						>
							{(alt) => <li class="text-primary">{alt.name}</li>}
						</Intersperse>
					</ul>
				</Show>
			</div>
		</>
	)
}

const TRIGGER_CLASS = "py-4"
function EventInfoTabs() {
	const ctx = assertContext(EventInfoPageContext)
	let hasDescription = () => Boolean(ctx.event.description)
	return (
		<Show when={hasDescription()}>
			<Tab.Root>
				<div class="border-b border-slate-300 px-4">
					<Tab.List class="grid-cols-1 gap-12">
						<Tab.Trigger
							value="Description"
							class={TRIGGER_CLASS}
						>
							Description
						</Tab.Trigger>
						<Tab.Indicator />
					</Tab.List>
				</div>
				<Tab.Content
					value="Description"
					class="p-4"
				>
					<EventInfoDescription />
				</Tab.Content>
			</Tab.Root>
		</Show>
	)
}

function EventInfoDescription() {
	const ctx = assertContext(EventInfoPageContext)
	return (
		<div class="p-2">
			<p class="text-base leading-relaxed font-light whitespace-pre-wrap text-secondary">
				{ctx.event.description}
			</p>
		</div>
	)
}
