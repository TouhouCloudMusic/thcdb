import {
	getInput,
	insert,
	remove,
	useField,
	useFieldArray,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { Tag, TagRelationType } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show } from "solid-js"

import { FormComp } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { Dialog } from "~/component/dialog"
import { FieldArrayFallback } from "~/component/form"
import { TagSearchDialog } from "~/component/form/SearchDialog"
import type { FieldBinding } from "~/component/form/types"
import type { TagRef } from "~/hey-api"
import { formStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"

import { useTagForm } from "../context"

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
})

const TAG_RELATION_TYPES = ["Inherit", "Derive"] as const

const typeStyles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
	select: { width: "100%" },
})

type TagRelationTypeFieldProps = {
	field: FieldBinding<TagRelationType>
}

type RelationTypeOption = {
	value: TagRelationType | undefined
	label: string
}

function TagRelationTypeField(props: TagRelationTypeFieldProps) {
	const { t } = useLingui()

	const options = (): RelationTypeOption[] => [
		{ value: undefined, label: t`-- Select relation type --` },
		...TAG_RELATION_TYPES.map((value) => ({ value, label: value })),
	]

	const selectedOption = () =>
		options().find((option) => option.value === props.field.input)

	const selectOption = (option: RelationTypeOption | undefined) =>
		props.field.onInput(option?.value)

	return (
		<div {...stylex.attrs(typeStyles.field)}>
			<Select.Root
				value={selectedOption()}
				onChange={selectOption}
				fieldProps={props.field.props}
				errors={props.field.errors}
				options={options()}
				optionValue="label"
				optionTextValue="label"
				placeholder={t`-- Select relation type --`}
				styles={typeStyles.select}
			>
				<Select.Trigger aria-label={t`Relation type`} />
				<Select.Content />
				<Select.ErrorList />
			</Select.Root>
		</div>
	)
}

const rowStyles = stylex.create({
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
	editButton: { height: "max-content", padding: px[8] },
	editIcon: { width: px[16], height: px[16] },
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

type TagRelationRowProps = {
	tag: FieldBinding<Pick<TagRef, "id" | "name">>
	type: FieldBinding<TagRelationType>
	filter: (tag: Tag) => boolean
	onSelect: (tag: Tag) => void
	onRemove: () => void
}

function TagRelationRow(props: TagRelationRowProps) {
	const { t } = useLingui()

	return (
		<li {...stylex.attrs(rowStyles.relationRow)}>
			<div {...stylex.attrs(rowStyles.tagSelection)}>
				<Show
					when={props.tag.input?.name}
					fallback={
						<span {...stylex.attrs(rowStyles.muted)}>{t`Select tag`}</span>
					}
				>
					{(name) => <span {...stylex.attrs(rowStyles.primary)}>{name()}</span>}
				</Show>
				<TagSearchDialog
					filter={props.filter}
					onSelect={props.onSelect}
					trigger={
						<Dialog.Trigger
							as={Button}
							appearance="ghost"
							tone="gray"
							styles={rowStyles.editButton}
						>
							<Pencil1Icon {...stylex.attrs(rowStyles.editIcon)} />
						</Dialog.Trigger>
					}
				/>
			</div>
			<TagRelationTypeField field={props.type} />
			<Button
				onClick={props.onRemove}
				appearance="ghost"
				tone="gray"
				styles={rowStyles.removeButton}
			>
				<Cross1Icon {...stylex.attrs(rowStyles.removeIcon)} />
			</Button>
			<ul {...stylex.attrs(rowStyles.relationErrors)}>
				<FormComp.ErrorList errors={props.tag.errors} />
			</ul>
		</li>
	)
}

type Props = {
	styles?: StyleXStyles
}

export function TagFormRelationsField(props: Props) {
	const { t } = useLingui()
	const { formStore, tag } = useTagForm()

	const relations = useFieldArray(formStore, {
		path: ["data", "relations"],
	})

	const addRelation = () => insert(formStore, { path: relations.path })

	const removeRelationAt = (index: number) =>
		remove(formStore, { path: relations.path, at: index })

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
			<FormComp.ErrorList errors={relations.errors} />
			<ul {...stylex.attrs(styles.relations)}>
				<For
					each={relations.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => {
						const relatedTag = useField(formStore, () => ({
							path: [...relations.path, index(), "tag"],
						}))

						const relationType = useField(formStore, () => ({
							path: [...relations.path, index(), "type"],
						}))

						const canSelectTag = (candidate: Tag) =>
							candidate.id !== tag?.id
							&& !getInput(formStore, {
								path: relations.path,
							})?.some(
								(entry, rowIndex) =>
									rowIndex !== index() && entry.tag?.id === candidate.id,
							)

						const selectTag = (selectedTag: Tag) => {
							if (canSelectTag(selectedTag)) relatedTag.onInput(selectedTag)
						}

						return (
							<TagRelationRow
								tag={relatedTag}
								type={relationType}
								filter={canSelectTag}
								onSelect={selectTag}
								onRemove={() => removeRelationAt(index())}
							/>
						)
					}}
				</For>
			</ul>
		</div>
	)
}
