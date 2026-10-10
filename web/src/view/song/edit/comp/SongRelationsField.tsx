import { useFieldArray, insert, remove, useField } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Song, SongRelationDirection, SongRelationType } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show } from "solid-js"

import { FormComp, Select } from "~/component/atomic"
import { inputStyles } from "~/component/atomic/Input"
import { Button } from "~/component/atomic/button"
import { FieldArrayFallback } from "~/component/form"
import { SongSearchDialog } from "~/component/form/SearchDialog"
import type { FieldBinding } from "~/component/form/types"
import type { SongRef } from "~/hey-api"
import { vSongRelationType } from "~/hey-api/valibot.gen"
import { textStyles } from "~/style"
import { dividerStyles, formStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"

import type { SongFormStore } from "./types"

const RELATION_DIRECTION_OPTIONS: SongRelationDirection[] = [
	"Source",
	"Derived",
]

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

function SongRelationRow(props: {
	song: FieldBinding<SongRef>
	direction: FieldBinding<SongRelationDirection>
	relationType: FieldBinding<SongRelationType>
	description: FieldBinding<string>
	selectSong: (song: Song) => void
	canSelectSong: (song: Song) => boolean
	removeRelation: () => void
	relationDirectionLabel: (direction: SongRelationDirection) => string
}) {
	const { t } = useLingui()

	return (
		<li {...stylex.attrs(rowStyles.root)}>
			<div {...stylex.attrs(rowStyles.selection)}>
				<span {...stylex.attrs(textStyles.ellipsis, rowStyles.value)}>
					{props.song.input?.title}
				</span>
				<SongSearchDialog
					onSelect={props.selectSong}
					filter={props.canSelectSong}
					icon={<Pencil1Icon {...stylex.attrs(rowStyles.icon)} />}
				/>
				<Button
					onClick={props.removeRelation}
					appearance="ghost"
					tone="gray"
					styles={rowStyles.removeButton}
				>
					<Cross1Icon {...stylex.attrs(rowStyles.icon)} />
				</Button>
			</div>
			<div {...stylex.attrs(rowStyles.column, rowStyles.directionColumn)}>
				<Select.Root
					styles={rowStyles.control}
					fieldProps={props.direction.props}
					errors={props.direction.errors}
					value={props.direction.input}
					onChange={props.direction.onInput}
					placeholder={t`-- Select direction --`}
					options={RELATION_DIRECTION_OPTIONS}
					optionTextValue={props.relationDirectionLabel}
				>
					<Select.Trigger />
					<Select.Content />
					<Select.ErrorList />
				</Select.Root>
			</div>
			<div {...stylex.attrs(rowStyles.column, rowStyles.typeColumn)}>
				<Select.Root
					styles={rowStyles.control}
					fieldProps={props.relationType.props}
					errors={props.relationType.errors}
					value={props.relationType.input}
					onChange={props.relationType.onInput}
					placeholder={t`-- Select relation type --`}
					options={vSongRelationType.options}
				>
					<Select.Trigger />
					<Select.Content />
					<Select.ErrorList />
				</Select.Root>
			</div>
			<div {...stylex.attrs(rowStyles.column, rowStyles.descriptionColumn)}>
				<input
					{...props.description.props}
					{...stylex.attrs(inputStyles.like, inputStyles.input)}
					placeholder={t`Description`}
					value={props.description.input ?? ""}
				/>
				<For each={props.description.errors}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>
			</div>
			<Show when={props.song.errors}>
				<ul {...stylex.attrs(rowStyles.errors)}>
					<FormComp.ErrorList
						errors={props.song.errors}
						styles={rowStyles.error}
					/>
				</ul>
			</Show>
		</li>
	)
}

type Props = {
	of: SongFormStore
	styles?: StyleXStyles
	currentSongId?: number
}

export function SongRelationsField(props: Props) {
	const { t } = useLingui()

	const relations = useFieldArray(() => props.of, {
		path: ["data", "relations"],
	})

	const canSelectSong = (candidate: Song) =>
		candidate.id !== props.currentSongId

	const relationDirectionLabel = (value: SongRelationDirection) =>
		value === "Source" ? t`Source` : t`Derived`

	const addRelation = (selected: Song) => {
		if (!canSelectSong(selected)) return
		insert(props.of, {
			path: relations.path,
			initialInput: {
				song: selected,
			},
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
					filter={canSelectSong}
					icon={<PlusIcon {...stylex.attrs(fieldStyles.icon)} />}
				/>
			</div>
			<hr {...stylex.attrs(dividerStyles.horizontal)} />
			<FormComp.ErrorList errors={relations.errors} />
			<ul {...stylex.attrs(fieldStyles.entries)}>
				<For
					each={relations.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => {
						const song = useField(
							() => props.of,
							() => ({
								path: [...relations.path, index(), "song"],
							}),
						)

						const direction = useField(
							() => props.of,
							() => ({
								path: [...relations.path, index(), "direction"],
							}),
						)

						const relationType = useField(
							() => props.of,
							() => ({
								path: [...relations.path, index(), "relation_type"],
							}),
						)

						const description = useField(
							() => props.of,
							() => ({
								path: [...relations.path, index(), "description"],
							}),
						)

						const selectSong = (selected: Song) => {
							if (!canSelectSong(selected)) return
							song.onInput(selected)
						}

						const removeRelation = () =>
							remove(props.of, {
								path: relations.path,
								at: index(),
							})

						return (
							<SongRelationRow
								song={song}
								direction={direction}
								relationType={relationType}
								description={description}
								selectSong={selectSong}
								canSelectSong={canSelectSong}
								removeRelation={removeRelation}
								relationDirectionLabel={relationDirectionLabel}
							/>
						)
					}}
				</For>
			</ul>
		</div>
	)
}
