import type { Label } from "@thc/api"
import { Show, Suspense } from "solid-js"

import { Link } from "~/component/atomic"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { CorrectionHistorySection } from "~/view/correction/Detail"

import { LabelInfoPageContext } from "./context"
import type { LabelInfoPageContextValue } from "./context"

type Props = {
	label: Label
}

export function LabelInfoPage(props: Props) {
	const contextValue: LabelInfoPageContextValue = {
		get label() {
			return props.label
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>Loading...</div>}>
				<LabelInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-y-6">
						<LabelInfoHeader />
						<LabelInfoDetails />
						<CorrectionHistorySection
							entityType="label"
							entityId={props.label.id}
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
		<header class="flex items-start justify-between gap-4">
			<div class="space-y-2">
				<h1 class="text-3xl leading-tight font-light tracking-tight text-primary">
					{ctx.label.name}
				</h1>
			</div>
			<Link
				to="/label/$id/edit"
				params={{ id: ctx.label.id.toString() }}
				class="text-sm"
			>
				Edit
			</Link>
		</header>
	)
}

function LabelInfoDetails() {
	const ctx = assertContext(LabelInfoPageContext)
	let hasLocalizedNames = () => ctx.label.localized_names.length > 0
	let hasFounders = () => ctx.label.founders.length > 0
	let founded = () => DateWithPrecision.display(ctx.label.founded_date)
	let dissolved = () => DateWithPrecision.display(ctx.label.dissolved_date)

	return (
		<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
			<Show when={founded()}>
				<span class="text-tertiary">Founded</span>
				<span>{founded()}</span>
			</Show>
			<Show when={dissolved()}>
				<span class="text-tertiary">Dissolved</span>
				<span>{dissolved()}</span>
			</Show>
			<Show when={hasLocalizedNames()}>
				<span class="text-tertiary">Localized Names</span>
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
				<span class="text-tertiary">Founders</span>
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
