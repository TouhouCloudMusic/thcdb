import { useLingui } from "@lingui/solid/macro"
import type { CorrectionHistoryItem, Tag } from "@thc/api"
import { createSignal, Show, Suspense } from "solid-js"

import { Link, Tab } from "~/component/atomic"
import { Intersperse } from "~/component/data/Intersperse"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import { createEntityCommentsController } from "~/view/comment/EntityCommentsController"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"

import { TagInfoPageContext } from "./context"
import type { TagInfoPageContextValue } from "./context"

type Props = {
	tag: Tag
	correctionHistory: CorrectionHistoryItem[]
}

export function TagInfoPage(props: Props) {
	const { t } = useLingui()
	const contextValue: TagInfoPageContextValue = {
		get tag() {
			return props.tag
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<TagInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-y-6">
						<TagInfoHeader />
						<TagInfoDetails />
						<AddToUserCollectionButton
							entityType="Tag"
							entityId={props.tag.id}
						/>
						<TagInfoTabs />
						<EntityCorrectionMetadataSection
							entityType="tag"
							entityId={props.tag.id}
							correctionHistory={props.correctionHistory}
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
	const { t } = useLingui()
	const ctx = assertContext(TagInfoPageContext)
	return (
		<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
			<div class="text-tertiary">{t`Type`}</div>
			<div>{ctx.tag.type}</div>
			<Show when={ctx.tag.alt_names && ctx.tag.alt_names.length > 0}>
				<span class="text-tertiary">{t`AKAs`}</span>
				<ul class="flex flex-wrap whitespace-pre">
					<Intersperse
						of={ctx.tag.alt_names}
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
	const { t } = useLingui()
	const ctx = assertContext(TagInfoPageContext)
	const hasDesc = () => Boolean(ctx.tag.description)
	const hasRelations = () =>
		Boolean(ctx.tag.relations && ctx.tag.relations.length > 0)
	const [activeTab, setActiveTab] = createSignal(
		hasDesc() ? "Description" : hasRelations() ? "Relations" : "Comments",
	)
	const comments = createEntityCommentsController(() => ({
		entityType: "tag",
		entityId: ctx.tag.id,
		listEnabled: activeTab() === "Comments",
	}))
	return (
		<Tab.Root
			value={activeTab()}
			onChange={setActiveTab}
		>
			<div class="border-b border-slate-300 px-4">
				<Tab.List class="gap-12">
					<Show when={hasDesc()}>
						<Tab.Trigger
							value="Description"
							class={TRIGGER_CLASS}
						>
							{t`Description`}
						</Tab.Trigger>
					</Show>
					<Show when={hasRelations()}>
						<Tab.Trigger
							value="Relations"
							class={TRIGGER_CLASS}
						>
							{t`Relations`}
						</Tab.Trigger>
					</Show>
					<EntityCommentsTabTrigger
						count={comments.activeCommentCount()}
						class={TRIGGER_CLASS}
					/>
					<Tab.Trigger
						value="Collections"
						class={TRIGGER_CLASS}
					>
						{t`Collections`}
					</Tab.Trigger>
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
			<Tab.Content
				value="Comments"
				class="p-4"
			>
				<EntityComments controller={comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				class="p-4"
			>
				<EntityCollectionsTab
					entityType="tag"
					entityId={ctx.tag.id}
					enabled={activeTab() === "Collections"}
				/>
			</Tab.Content>
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
	const list = () => ctx.tag.relations ?? []
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
