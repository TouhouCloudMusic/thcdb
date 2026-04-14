import { t } from "@lingui/core/macro"
import type { CorrectionHistoryItem, Label } from "@thc/api"
import { Show, Suspense } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"

import { LabelInfoPageContext } from "./context"
import type { LabelInfoPageContextValue } from "./context"

type Props = {
	label: Label
	correctionHistory: CorrectionHistoryItem[]
}

export function LabelInfoPage(props: Props) {
	const contextValue: LabelInfoPageContextValue = {
		get label() {
			return props.label
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<LabelInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-y-6">
						<LabelInfoHeader />
						<LabelInfoDetails />
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
		</div>
	)
}
