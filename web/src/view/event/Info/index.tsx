import { useLingui } from "@lingui/solid/macro"
import type { CorrectionHistoryItem, Event } from "@thc/api"
import { createSignal, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityComments } from "~/view/comment/EntityComments"
import { createEntityCommentsController } from "~/view/comment/EntityCommentsController"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"

import { EventInfoPageContext } from "./context"
import type { EventInfoPageContextValue } from "./context"

type EventInfoPageProps = {
	event: Event
	correctionHistory: CorrectionHistoryItem[]
}

export function EventInfoPage(props: EventInfoPageProps) {
	const { t } = useLingui()
	const contextValue: EventInfoPageContextValue = {
		get event() {
			return props.event
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<EventInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-y-6">
						<div class="flex flex-col gap-y-4">
							<EventInfoHeader />
							<AddToUserCollectionButton
								entityType="Event"
								entityId={props.event.id}
							/>
						</div>
						<EventInfoTabs />
						<EntityCorrectionMetadataSection
							entityType="event"
							entityId={props.event.id}
							correctionHistory={props.correctionHistory}
						/>
					</div>
				</EventInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

function EventInfoHeader() {
	const { t } = useLingui()
	const ctx = assertContext(EventInfoPageContext)

	const alternativeNames = () => ctx.event.alternative_names ?? []
	const hasAlternativeNames = () => alternativeNames().length > 0
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
				<span class="text-tertiary">{t`Date`}</span>

				<Show
					when={ctx.event.start_date}
					fallback={<span>{t`N/A`}</span>}
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
					<span class="text-tertiary">{t`AKAs`}</span>
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
	const { t } = useLingui()
	const ctx = assertContext(EventInfoPageContext)
	const [activeTab, setActiveTab] = createSignal(
		ctx.event.description ? "Description" : "Comments",
	)
	const comments = createEntityCommentsController(() => ({
		entityType: "event",
		entityId: ctx.event.id,
		listEnabled: activeTab() === "Comments",
	}))
	const hasDescription = () => Boolean(ctx.event.description)
	return (
		<Tab.Root
			value={activeTab()}
			onChange={setActiveTab}
		>
			<div class="border-b border-slate-300 px-4">
				<Tab.List class="gap-12">
					<Show when={hasDescription()}>
						<Tab.Trigger
							value="Description"
							class={TRIGGER_CLASS}
						>
							{t`Description`}
						</Tab.Trigger>
					</Show>
					<EntityCommentsTabTrigger
						count={comments.activeCommentCount()}
						class={TRIGGER_CLASS}
					/>
					<Tab.Indicator />
				</Tab.List>
			</div>
			<Show when={hasDescription()}>
				<Tab.Content
					value="Description"
					class="p-4"
				>
					<EventInfoDescription />
				</Tab.Content>
			</Show>
			<Tab.Content
				value="Comments"
				class="p-4"
			>
				<EntityComments controller={comments} />
			</Tab.Content>
		</Tab.Root>
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
