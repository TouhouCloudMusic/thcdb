import {
	Field,
	FieldArray,
	getErrors,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import type { Song, SongRef, SongRelation } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { FormComp, Select } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { FieldArrayFallback } from "~/component/form"
import { SongSearchDialog } from "~/component/form/SearchDialog"
import { songRelationTypes } from "~/hey-api"
import type { SongRelationType as SongRelationTypeLookup } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

import type { SongFormStore } from "./types"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
		flexDirection: "column",
	},
	fieldHeader: {
		marginBottom: px[16],
		display: "flex",
		placeContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	label: {
		margin: 0,
	},
	addButton: {
		height: "max-content",
		padding: px[8],
	},
	icon: {
		width: px[16],
		height: px[16],
	},
	entries: {
		display: "flex",
		minHeight: px[128],
		flexDirection: "column",
		gap: px[8],
	},
	entry: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) 12rem minmax(0,1fr) auto",
		columnGap: px[8],
		rowGap: px[4],
	},
	selection: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) auto",
		alignItems: "center",
		columnGap: px[8],
	},
	placeholder: {
		color: colors.textTertiary,
	},
	value: {
		color: colors.textPrimary,
	},
	column: {
		display: "flex",
		flexDirection: "column",
	},
	control: {
		width: "100%",
	},
	descriptionInput: {
		height: px[36],
		width: "100%",
		borderRadius: radius.md,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[300],
		paddingInline: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textPrimary,
	},
	removeButton: {
		aspectRatio: "1 / 1",
	},
	removeIcon: {
		marginInline: "auto",
	},
	errors: {
		gridColumn: "span 4 / span 4",
		display: "grid",
		gridTemplateColumns: "subgrid",
	},
})

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

const EMPTY_RELATION_TYPE_ID = ""
const SONG_RELATION_TYPES_CACHE_TIME = 86_400_000

function parseRelationTypeId(value: string | null | undefined) {
	return value === EMPTY_RELATION_TYPE_ID
		|| value === undefined
		|| value === null
		? undefined
		: Number.parseInt(value, 10)
}

export function SongRelationsField(props: Props) {
	const { t } = useLingui()
	const relationTypesQuery = useQuery(() => ({
		queryKey: ["songRelationTypes"],
		queryFn: async () => {
			const response = await songRelationTypes({ throwOnError: true })
			return response.data.data
		},
		staleTime: SONG_RELATION_TYPES_CACHE_TIME,
		gcTime: SONG_RELATION_TYPES_CACHE_TIME,
		throwOnError: true,
	}))
	const [songRefs, setSongRefs] = createStore<(SongRef | undefined)[]>(
		untrack(() => props.initRelations?.map((relation) => relation.song) ?? []),
	)

	const isRelationExists = (candidate: Song, ignoreIndex?: number) => {
		if (candidate.id === props.currentSongId) return true
		return songRefs.some((entry, idx) => {
			if (!entry) return false
			if (idx === ignoreIndex) return false
			return entry.id === candidate.id
		})
	}

	const addRelation = () => {
		insert(props.of, { path: ["data", "relations"] })
		setSongRefs(songRefs.length, undefined)
	}

	const removeRelationAt = (index: number) => {
		remove(props.of, { path: ["data", "relations"], at: index })
		setSongRefs((list) => list.toSpliced(index, 1))
	}

	const setSongAt = (index: number, selected: Song) => {
		if (isRelationExists(selected, index)) return
		setSongRefs(index, () => toSongRef(selected))
		setInput(props.of, {
			path: ["data", "relations", index, "related_song_id"],
			input: selected.id,
		})
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Relations`}</label>
				<Button
					onClick={addRelation}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "relations"] })}
			/>
			<ul {...stylex.attrs(styles.entries)}>
				<FieldArray
					of={props.of}
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
									of={props.of}
									currentSongId={props.currentSongId}
									relationTypes={relationTypesQuery.data ?? []}
									songRef={songRefs[idx()]}
									songRefs={songRefs}
									onSelectSong={(selectedSong) =>
										setSongAt(idx(), selectedSong)
									}
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
	of: SongFormStore
	currentSongId: number | undefined
	relationTypes: SongRelationTypeLookup[]
	songRef: SongRef | undefined
	songRefs: (SongRef | undefined)[]
	onSelectSong: (song: Song) => void
	onRemove: () => void
}

function RelationRow(props: RelationRowProps) {
	const { t } = useLingui()
	const dataFilter = createMemo(() => {
		const relatedSongIds = new Set<number>()
		for (const [index, songRef] of props.songRefs.entries()) {
			if (index !== props.index && songRef) {
				relatedSongIds.add(songRef.id)
			}
		}
		const currentSongId = props.currentSongId

		return (candidate: Song) =>
			candidate.id !== currentSongId && !relatedSongIds.has(candidate.id)
	})
	const relationTypeNameById = createMemo(() => {
		return new Map(
			props.relationTypes.map((relationType) => [
				relationType.id.toString(),
				relationType.name,
			]),
		)
	})
	const relationTypeOptions = createMemo(() => [
		EMPTY_RELATION_TYPE_ID,
		...relationTypeNameById().keys(),
	])
	const relationTypeLabel = (value: string) => {
		const label = relationTypeNameById().get(value) ?? value
		return label === "" ? t`-- Select relation type --` : label
	}

	return (
		<li {...stylex.attrs(styles.entry)}>
			<div {...stylex.attrs(styles.selection)}>
				<Show
					when={props.songRef?.title}
					fallback={
						<span {...stylex.attrs(styles.placeholder)}>{t`Select song`}</span>
					}
				>
					{(value) => <span {...stylex.attrs(styles.value)}>{value()}</span>}
				</Show>
				<SongSearchDialog
					onSelect={props.onSelectSong}
					dataFilter={dataFilter()}
					icon={<Pencil1Icon {...stylex.attrs(styles.icon)} />}
				/>
			</div>
			<Field
				of={props.of}
				path={["data", "relations", props.index, "relation_type_id"]}
			>
				{(field) => (
					<div {...stylex.attrs(styles.column)}>
						<Select.Root<string>
							name={field.props.name}
							{...stylex.attrs(styles.control)}
							value={field.input?.toString() ?? EMPTY_RELATION_TYPE_ID}
							onChange={(value) => field.onInput(parseRelationTypeId(value))}
							options={relationTypeOptions()}
							itemComponent={(itemProps) => (
								<Select.Item item={itemProps.item}>
									{relationTypeLabel(itemProps.item.rawValue)}
								</Select.Item>
							)}
						>
							<Select.HiddenSelect
								onChange={field.props.onChange}
								onInput={field.props.onInput}
								onBlur={field.props.onBlur}
								onFocus={field.props.onFocus}
							/>
							<Select.Trigger styles={[styles.control]}>
								<Select.Value<string>>
									{(state) => relationTypeLabel(state.selectedOption())}
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
					<div {...stylex.attrs(styles.column)}>
						<input
							{...field.props}
							{...stylex.attrs(styles.descriptionInput)}
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
			<Button
				onClick={props.onRemove}
				appearance="ghost"
				tone="gray"
				styles={styles.removeButton}
			>
				<Cross1Icon {...stylex.attrs(styles.removeIcon)} />
			</Button>
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
						<ul {...stylex.attrs(styles.errors)}>
							<FormComp.ErrorList errors={field.errors} />
						</ul>
					</>
				)}
			</Field>
		</li>
	)
}
