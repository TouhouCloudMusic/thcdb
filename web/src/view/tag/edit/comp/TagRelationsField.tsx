import {
	Field,
	FieldArray,
	getErrors,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { Tag, TagRef, TagRelationType } from "@thc/api"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { FormComp, Select } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { FieldArrayFallback } from "~/component/form"
import { TagSearchDialog } from "~/component/form/SearchDialog"
import { TagM } from "~/domain/tag"

import { useTagForm } from "../context"
import type { TagFormStore } from "./types"

type Props = {
	class?: string
}

const TAG_RELATION_TYPES: TagRelationType[] = ["Inherit", "Derive"]

export function TagFormRelationsField(props: Props) {
	const { formStore, tag } = useTagForm()

	const [tagRefs, setTagRefs] = createStore<(TagRef | undefined)[]>(
		tag?.relations?.map((relation) => relation.tag) ?? [],
	)

	const isRelationExists = (candidate: Tag, ignoreIndex?: number) => {
		if (candidate.id === tag?.id) return true
		return tagRefs.some((entry, idx) => {
			if (!entry) return false
			if (idx === ignoreIndex) return false

			return entry.id === candidate.id
		})
	}

	const addRelation = () => {
		insert(formStore, { path: ["data", "relations"] })
		setTagRefs(tagRefs.length, undefined)
	}

	const removeRelationAt = (index: number) => () => {
		remove(formStore, { path: ["data", "relations"], at: index })
		setTagRefs((list) => list.toSpliced(index, 1))
	}

	const setTagAt = (index: number) => (selected: Tag) => {
		if (isRelationExists(selected, index)) return
		setTagRefs(index, () => TagM.toTagRef(selected))
		setInput(formStore, {
			path: ["data", "relations", index, "related_tag_id"],
			input: selected.id,
		})
	}

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Relations</Trans>
				</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addRelation}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(formStore, { path: ["data", "relations"] })}
			/>
			<ul class="flex min-h-32 flex-col gap-2">
				<FieldArray
					of={formStore}
					path={["data", "relations"]}
				>
					{(fieldArray) => (
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<RelationRow
									index={idx()}
									formStore={formStore}
									tagRef={tagRefs[idx()]}
									onSelectTag={setTagAt(idx())}
									onRemove={removeRelationAt(idx())}
									dataFilter={(tag) => !isRelationExists(tag, idx())}
								/>
							)}
						</For>
					)}
				</FieldArray>
			</ul>
		</div>
	)
}

type RelationRowProps = {
	index: number
	formStore: TagFormStore
	tagRef: TagRef | undefined
	onSelectTag: (tag: Tag) => void
	onRemove: () => void
	dataFilter: (tag: Tag) => boolean
}

function RelationRow(props: RelationRowProps) {
	return (
		<li class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-2 gap-y-1">
			<div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
				<RelationTagLabel
					value={props.tagRef?.name}
					placeholder="Select tag"
				/>
				<TagSearchDialog
					onSelect={props.onSelectTag}
					dataFilter={props.dataFilter}
					icon={<Pencil1Icon class="size-4" />}
				/>
			</div>
			<Field
				of={props.formStore}
				path={["data", "relations", props.index, "type"]}
			>
				{(field) => (
					<div class="flex flex-col">
						<Select
							{...field.props}
							class="w-full"
							value={field.input ?? ""}
						>
							<Select.Option value="">-- Select relation type --</Select.Option>
							<For each={TAG_RELATION_TYPES}>
								{(type) => <Select.Option value={type}>{type}</Select.Option>}
							</For>
						</Select>
						<For each={field.errors}>
							{(error) => (
								<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
							)}
						</For>
					</div>
				)}
			</Field>
			<Button
				variant="Tertiary"
				onClick={props.onRemove}
				class="aspect-square"
			>
				<Cross1Icon class="mx-auto" />
			</Button>
			<Field
				of={props.formStore}
				path={["data", "relations", props.index, "related_tag_id"]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? undefined}
						/>
						<ul class="col-span-3 grid grid-cols-subgrid">
							<FormComp.ErrorList errors={field.errors} />
						</ul>
					</>
				)}
			</Field>
		</li>
	)
}

function RelationTagLabel(props: { value?: string; placeholder: string }) {
	return (
		<Show
			when={props.value}
			fallback={<span class="text-tertiary">{props.placeholder}</span>}
		>
			{(value) => <span class="text-primary">{value()}</span>}
		</Show>
	)
}
