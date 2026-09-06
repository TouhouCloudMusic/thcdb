import { useLingui } from "@lingui/solid/macro"
import type { CorrectionHistoryItem, Label } from "@thc/api"
import { createSignal, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic"
import { ExternalLinks } from "~/component/data/ExternalLinks"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import {
	ADD_TO_COLLECTION_ACTIONS_CLASS,
	AddToUserCollectionButton,
} from "~/view/collection/AddToUserCollectionButton"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"

import { LabelInfoPageContext } from "./context"
import type { LabelInfoPageContextValue } from "./context"

type Props = {
	label: Label
	correctionHistory: CorrectionHistoryItem[]
}

export function LabelInfoPage(props: Props) {
	const { t } = useLingui()
	const contextValue: LabelInfoPageContextValue = {
		get label() {
			return props.label
		},
	}

	return (
		<PageLayout class="p-[clamp(1rem,4vw,2rem)]">
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<LabelInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-y-6">
						<LabelInfoHeader />
						<LabelInfoDetails />
						<div class={ADD_TO_COLLECTION_ACTIONS_CLASS}>
							<AddToUserCollectionButton
								entityType="Label"
								entityId={props.label.id}
							/>
						</div>
						<LabelInfoComments />
						<EntityCorrectionMetadataSection
							entityType="label"
							entityId={props.label.id}
							correctionHistory={props.correctionHistory}
						/>
					</div>
				</LabelInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

function LabelInfoHeader() {
	const ctx = assertContext(LabelInfoPageContext)
	return (
		<header>
			<h1 class="text-3xl leading-tight font-light tracking-tight text-primary">
				{ctx.label.name}
			</h1>
		</header>
	)
}

function LabelInfoDetails() {
	const { t } = useLingui()
	const ctx = assertContext(LabelInfoPageContext)
	const hasLocalizedNames = () => ctx.label.localized_names.length > 0
	const hasFounders = () => ctx.label.founders.length > 0
	const founded = () => DateWithPrecision.display(ctx.label.founded_date)
	const dissolved = () => DateWithPrecision.display(ctx.label.dissolved_date)

	return (
		<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
			<Show when={founded()}>
				<span class="text-tertiary">{t`Founded`}</span>
				<span>{founded()}</span>
			</Show>
			<Show when={dissolved()}>
				<span class="text-tertiary">{t`Dissolved`}</span>
				<span>{dissolved()}</span>
			</Show>
			<Show when={hasLocalizedNames()}>
				<span class="text-tertiary">{t`Localized Names`}</span>
				<ul class="flex flex-wrap gap-0.5 whitespace-pre">
					<Intersperse
						of={ctx.label.localized_names}
						with={<span class="whitespace-pre">, </span>}
					>
						{(item) => (
							<li class="text-secondary">
								{item.name} ({item.language.code})
							</li>
						)}
					</Intersperse>
				</ul>
			</Show>
			<Show when={hasFounders()}>
				<span class="text-tertiary">{t`Founders`}</span>
				<ul class="flex flex-wrap gap-0.5 whitespace-pre">
					<Intersperse
						of={ctx.label.founders}
						with={<span class="whitespace-pre">, </span>}
					>
						{(id) => <li class="text-secondary">#{id}</li>}
					</Intersperse>
				</ul>
			</Show>
			<ExternalLinks
				links={ctx.label.links}
				class="contents"
				labelClass="text-tertiary"
			/>
		</div>
	)
}

function LabelInfoComments() {
	const { t } = useLingui()
	const ctx = assertContext(LabelInfoPageContext)
	const [activeTab, setActiveTab] = createSignal("Comments")
	const comments = useEntityComments(() => ({
		entityType: "label",
		entityId: ctx.label.id,
		listEnabled: activeTab() === "Comments",
	}))

	return (
		<Tab.Root
			value={activeTab()}
			onChange={setActiveTab}
		>
			<Tab.ScrollArea>
				<Tab.List class={Tab.CONTAINER_CLASS}>
					<EntityCommentsTabTrigger
						count={comments.activeCommentCount()}
						class="py-3"
					/>
					<Tab.Trigger
						value="Collections"
						class="py-3"
					>
						{t`Collections`}
					</Tab.Trigger>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>
			<Tab.Content
				value="Comments"
				class="p-4"
			>
				<EntityComments model={comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				class="p-4"
			>
				<EntityCollectionsTab
					entityType="label"
					entityId={ctx.label.id}
					enabled={activeTab() === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}
