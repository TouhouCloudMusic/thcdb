import { Field, getErrors, insert, remove, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type {
	Song,
	SongRef,
	SongRelation,
	SongRelationDirection,
	SongRelationType,
} from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { FormComp, Select } from "~/component/atomic"
import { inputStyles } from "~/component/atomic/Input"
import { Button } from "~/component/atomic/button"
import { FieldArrayFallback } from "~/component/form"
import { SongSearchDialog } from "~/component/form/SearchDialog"
import { vSongRelationType } from "~/hey-api/valibot.gen"
import { textStyles } from "~/style"
import { dividerStyles, formStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"

import type { SongFormStore } from "./types"

type Props = {
	of: SongFormStore
	styles?: StyleXStyles
	currentSongId?: number
	initRelations?: SongRelation[]
}

function toSongRef(song: Song): SongRef {
	return {
		id: song.id,
		title: song.title,
	}
}

const SONG_RELATION_TYPE_FIELD_OPTIONS = vSongRelationType.options.map(
	(value) => ({ value, label: value }),
)

const fieldStyles = stylex.create({
	root: {
		containerType: "inline-size",
		display: "flex",
		flexDirection: "column",
	},
	header: {
		display: "flex",
		height: px[32],
		placeContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	label: {
		marginBottom: 0,
	},
	entries: {
		display: "flex",
		minHeight: px[128],
		flexDirection: "column",
		marginTop: px[8],
		gap: px[8],
	},
	icon: {
		width: px[16],
		height: px[16],
	},
})

export function SongRelationsField(props: Props) {
	const { t } = useLingui()
	const [songRefs, setSongRefs] = createStore<SongRef[]>(
		untrack(() => props.initRelations?.map((relation) => relation.song) ?? []),
	)

	const addRelation = (selected: Song) => {
		if (selected.id === props.currentSongId) return
		insert(props.of, {
			path: ["data", "relations"],
			initialInput: { related_song_id: selected.id, description: "" },
		})
		setSongRefs(songRefs.length, toSongRef(selected))
	}

	const removeRelationAt = (index: number) => {
		remove(props.of, { path: ["data", "relations"], at: index })
		setSongRefs((list) => list.toSpliced(index, 1))
	}

	const setSongAt = (index: number, selected: Song) => {
		if (selected.id === props.currentSongId) return
		setSongRefs(index, () => toSongRef(selected))
		setInput(props.of, {
			path: ["data", "relations", index, "related_song_id"],
			input: selected.id,
		})
	}

	return (
		<div {...stylex.attrs(fieldStyles.root, props.styles)}>
			<div {...stylex.attrs(fieldStyles.header)}>
				<label
					{...stylex.attrs(formStyles.label, fieldStyles.label)}
				>{t`Relations`}</label>
				<SongSearchDialog
					onSelect={addRelation}
					dataFilter={(candidate) => candidate.id !== props.currentSongId}
					icon={<PlusIcon {...stylex.attrs(fieldStyles.icon)} />}
				/>
			</div>
			<hr {...stylex.attrs(dividerStyles.horizontal)} />
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "relations"] })}
			/>
			<ul {...stylex.attrs(fieldStyles.entries)}>
				<For
					each={songRefs}
					fallback={<FieldArrayFallback />}
				>
					{(songRef, idx) => (
						<RelationRow
							index={idx()}
							of={props.of}
							currentSongId={props.currentSongId}
							songRef={songRef}
							onSelectSong={(selectedSong) => setSongAt(idx(), selectedSong)}
							onRemove={() => removeRelationAt(idx())}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}

type RelationRowProps = {
	index: number
	of: SongFormStore
	currentSongId: number | undefined
	songRef: SongRef
	onSelectSong: (song: Song) => void
	onRemove: () => void
}

type RelationOption<Value extends string> = { value: Value; label: string }

const rowStyles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: {
			default: "minmax(0,1fr)",
			"@container (28rem <= width < 56rem)": "repeat(2, minmax(0,1fr))",
			"@container (min-width: 56rem)":
				"minmax(0,1fr) 14rem 12rem minmax(0,1fr)",
		},
		gridTemplateAreas: {
			default: '"song" "direction" "type" "description"',
			"@container (28rem <= width < 56rem)":
				'"song song" "direction type" "description description"',
			"@container (min-width: 56rem)": '"song direction type description"',
		},
		gap: px[8],
	},
	selection: {
		gridArea: "song",
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) auto auto",
		alignItems: "center",
		columnGap: px[8],
	},
	value: {
		color: colors.textSecondary,
	},
	column: {
		display: "flex",
		flexDirection: "column",
	},
	directionColumn: { gridArea: "direction" },
	typeColumn: { gridArea: "type" },
	descriptionColumn: { gridArea: "description" },
	control: { display: "grid" },
	removeButton: {
		padding: px[8],
	},
	errors: {
		gridColumn: "1 / -1",
		display: "grid",
		rowGap: px[8],
	},
	error: { marginTop: 0 },
	icon: {
		width: px[16],
		height: px[16],
	},
})

function RelationRow(props: RelationRowProps) {
	const { t } = useLingui()
	const dataFilter = createMemo(() => {
		const currentSongId = props.currentSongId
		return (candidate: Song) => candidate.id !== currentSongId
	})
	const relationDirectionOptions = createMemo<
		RelationOption<SongRelationDirection>[]
	>(() => [
		{ value: "Source", label: t`Source` },
		{ value: "Derived", label: t`Derived` },
	])
	return (
		<li {...stylex.attrs(rowStyles.root)}>
			<div {...stylex.attrs(rowStyles.selection)}>
				<span {...stylex.attrs(textStyles.ellipsis, rowStyles.value)}>
					{props.songRef.title}
				</span>
				<SongSearchDialog
					onSelect={props.onSelectSong}
					dataFilter={dataFilter()}
					icon={<Pencil1Icon {...stylex.attrs(rowStyles.icon)} />}
				/>
				<Button
					onClick={props.onRemove}
					appearance="ghost"
					tone="gray"
					styles={rowStyles.removeButton}
				>
					<Cross1Icon {...stylex.attrs(rowStyles.icon)} />
				</Button>
			</div>
			<Field
				of={props.of}
				path={["data", "relations", props.index, "direction"]}
			>
				{(field) => (
					<div {...stylex.attrs(rowStyles.column, rowStyles.directionColumn)}>
						<Select.Root<RelationOption<SongRelationDirection>>
							styles={rowStyles.control}
							name={field.props.name}
							validationState={field.errors ? "invalid" : "valid"}
							value={relationDirectionOptions().find(
								(option) => option.value === field.input,
							)}
							placeholder={t`-- Select direction --`}
							onChange={(option) => field.onInput(option?.value)}
							options={relationDirectionOptions()}
							optionValue="value"
							optionTextValue="label"
							itemComponent={(itemProps) => (
								<Select.Item item={itemProps.item}>
									{itemProps.item.rawValue.label}
								</Select.Item>
							)}
						>
							<Select.HiddenSelect
								onChange={field.props.onChange}
								onInput={field.props.onInput}
								onBlur={field.props.onBlur}
								onFocus={field.props.onFocus}
							/>
							<Select.Trigger aria-invalid={field.errors ? true : undefined}>
								<Select.Value<RelationOption<SongRelationDirection>>>
									{(state) => state.selectedOption().label}
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
			<Field
				of={props.of}
				path={["data", "relations", props.index, "relation_type"]}
			>
				{(field) => (
					<div {...stylex.attrs(rowStyles.column, rowStyles.typeColumn)}>
						<Select.Root<RelationOption<SongRelationType>>
							styles={rowStyles.control}
							name={field.props.name}
							validationState={field.errors ? "invalid" : "valid"}
							value={SONG_RELATION_TYPE_FIELD_OPTIONS.find(
								(option) => option.value === field.input,
							)}
							placeholder={t`-- Select relation type --`}
							onChange={(option) => field.onInput(option?.value)}
							options={SONG_RELATION_TYPE_FIELD_OPTIONS}
							optionValue="value"
							optionTextValue="label"
							itemComponent={(itemProps) => (
								<Select.Item item={itemProps.item}>
									{itemProps.item.rawValue.label}
								</Select.Item>
							)}
						>
							<Select.HiddenSelect
								onChange={field.props.onChange}
								onInput={field.props.onInput}
								onBlur={field.props.onBlur}
								onFocus={field.props.onFocus}
							/>
							<Select.Trigger aria-invalid={field.errors ? true : undefined}>
								<Select.Value<RelationOption<SongRelationType>>>
									{(state) => state.selectedOption().label}
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
			<Field
				of={props.of}
				path={["data", "relations", props.index, "description"]}
			>
				{(field) => (
					<div {...stylex.attrs(rowStyles.column, rowStyles.descriptionColumn)}>
						<input
							{...field.props}
							{...stylex.attrs(inputStyles.like, inputStyles.input)}
							placeholder={t`Description`}
							value={field.input ?? ""}
						/>
						<For each={field.errors}>
							{(error) => (
								<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
							)}
						</For>
					</div>
				)}
			</Field>
			<Field
				of={props.of}
				path={["data", "relations", props.index, "related_song_id"]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? undefined}
						/>
						<Show when={field.errors}>
							<ul {...stylex.attrs(rowStyles.errors)}>
								<FormComp.ErrorList
									errors={field.errors}
									styles={rowStyles.error}
								/>
							</ul>
						</Show>
					</>
				)}
			</Field>
		</li>
	)
}
