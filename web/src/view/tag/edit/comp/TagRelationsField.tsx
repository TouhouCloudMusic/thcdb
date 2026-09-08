import {
	Field,
	FieldArray,
	getErrors,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { Tag, TagRef, TagRelationType } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { FormComp, Select } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { FieldArrayFallback } from "~/component/form"
import { TagSearchDialog } from "~/component/form/SearchDialog"
import { TagM } from "~/domain/tag"
import { formStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"

import { useTagForm } from "../context"
import type { TagFormStore } from "./types"

const styles = stylex.create({
	arrayField: {
		display: "flex",
		minHeight: px[128],
		flexDirection: "column",
	},
	fieldHeader: {
		marginBottom: px[16],
		display: "flex",
		alignContent: "space-between",
		justifyContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	fieldLabel: { margin: 0 },
	editButton: { height: "max-content", padding: px[8] },
	editIcon: { width: px[16], height: px[16] },
	relations: {
		display: "flex",
		minHeight: px[128],
		flexDirection: "column",
		gap: px[8],
	},
	relationRow: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
		columnGap: px[8],
		rowGap: px[4],
	},
	tagSelection: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) auto",
		alignItems: "center",
		columnGap: px[8],
	},
	field: { display: "flex", flexDirection: "column" },
	select: { width: "100%" },
	removeButton: { aspectRatio: "1 / 1" },
	removeIcon: { marginInline: "auto" },
	relationErrors: {
		gridColumn: "span 3 / span 3",
		display: "grid",
		gridTemplateColumns: "subgrid",
	},
	muted: { color: colors.textTertiary },
	primary: { color: colors.textPrimary },
})

type Props = {
	styles?: StyleXStyles
}

const TAG_RELATION_TYPES: TagRelationType[] = ["Inherit", "Derive"]

const TAG_RELATION_TYPE_OPTIONS: ("" | TagRelationType)[] = [
	"",
	...TAG_RELATION_TYPES,
]

export function TagFormRelationsField(props: Props) {
	const { t } = useLingui()
	const { formStore, tag } = useTagForm()

	const [tagRefs, setTagRefs] = createStore<(TagRef | undefined)[]>(
		untrack(() => tag?.relations?.map((relation) => relation.tag) ?? []),
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

	const removeRelationAt = (index: number) => {
		remove(formStore, { path: ["data", "relations"], at: index })
		setTagRefs((list) => list.toSpliced(index, 1))
	}

	const setTagAt = (index: number, selected: Tag) => {
		if (isRelationExists(selected, index)) return
		setTagRefs(index, () => TagM.toTagRef(selected))
		setInput(formStore, {
			path: ["data", "relations", index, "related_tag_id"],
			input: selected.id,
		})
	}

	return (
		<div {...stylex.attrs(styles.arrayField, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.fieldLabel)}
				>{t`Relations`}</label>
				<Button
					onClick={addRelation}
					appearance="ghost"
					tone="gray"
					styles={styles.editButton}
				>
					<PlusIcon {...stylex.attrs(styles.editIcon)} />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(formStore, { path: ["data", "relations"] })}
			/>
			<ul {...stylex.attrs(styles.relations)}>
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
									tagRefs={tagRefs}
									tagId={tag?.id}
									onSelectTag={(selectedTag) => setTagAt(idx(), selectedTag)}
									onRemove={() => removeRelationAt(idx())}
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
	tagRefs: (TagRef | undefined)[]
	tagId: number | undefined
	onSelectTag: (tag: Tag) => void
	onRemove: () => void
}

function RelationRow(props: RelationRowProps) {
	const { t } = useLingui()
	const dataFilter = createMemo(() => {
		const ignoreIndex = props.index
		const relationIds = new Set(
			props.tagRefs
				.map((entry, idx) => (idx === ignoreIndex ? undefined : entry?.id))
				.filter((id): id is number => typeof id === "number"),
		)
		const currentTagId = props.tagId
		return (candidate: Tag) => {
			if (currentTagId && candidate.id === currentTagId) return false
			return !relationIds.has(candidate.id)
		}
	})
	return (
		<li {...stylex.attrs(styles.relationRow)}>
			<div {...stylex.attrs(styles.tagSelection)}>
				<RelationTagLabel
					value={props.tagRef?.name}
					placeholder={t`Select tag`}
				/>
				<TagSearchDialog
					onSelect={props.onSelectTag}
					dataFilter={dataFilter()}
					trigger={
						<Dialog.Trigger
							as={Button}
							appearance="ghost"
							tone="gray"
							styles={styles.editButton}
						>
							<Pencil1Icon {...stylex.attrs(styles.editIcon)} />
						</Dialog.Trigger>
					}
				/>{" "}
			</div>
			<Field
				of={props.formStore}
				path={["data", "relations", props.index, "type"]}
			>
				{(field) => (
					<div {...stylex.attrs(styles.field)}>
						<Select.Root<"" | TagRelationType>
							name={field.props.name}
							{...stylex.attrs(styles.select)}
							value={field.input ?? ""}
							onChange={(value) => {
								const next = value ?? ""
								field.onInput(next === "" ? undefined : next)
							}}
							options={TAG_RELATION_TYPE_OPTIONS}
							itemComponent={(itemProps) => (
								<Select.Item item={itemProps.item}>
									{itemProps.item.rawValue === ""
										? t`-- Select relation type --`
										: itemProps.item.rawValue}
								</Select.Item>
							)}
						>
							<Select.HiddenSelect
								onChange={field.props.onChange}
								onInput={field.props.onInput}
								onBlur={field.props.onBlur}
								onFocus={field.props.onFocus}
							/>
							<Select.Trigger styles={styles.select}>
								<Select.Value<"" | TagRelationType>>
									{(state) => {
										const selectedOption = state.selectedOption()
										return selectedOption === ""
											? t`-- Select relation type --`
											: selectedOption
									}}
								</Select.Value>
								<Select.Icon />
							</Select.Trigger>
							<Select.Portal>
								<Select.Content>
									<Select.Listbox />
								</Select.Content>
							</Select.Portal>
						</Select.Root>
						<For each={field.errors}>
							{(error) => (
								<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
							)}
						</For>
					</div>
				)}
			</Field>
			<Button
				onClick={props.onRemove}
				appearance="ghost"
				tone="gray"
				styles={styles.removeButton}
			>
				<Cross1Icon {...stylex.attrs(styles.removeIcon)} />
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
						<ul {...stylex.attrs(styles.relationErrors)}>
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
			fallback={
				<span {...stylex.attrs(styles.muted)}>{props.placeholder}</span>
			}
		>
			{(value) => <span {...stylex.attrs(styles.primary)}>{value()}</span>}
		</Show>
	)
}
