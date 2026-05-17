import {
	Field,
	FieldArray,
	getErrors,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Song, SongRef, SongRelation } from "@thc/api"
import { For, Show, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { FormComp, Select } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { FieldArrayFallback } from "~/component/form"
import { SongSearchDialog } from "~/component/form/SearchDialog"
import { songRelationTypes } from "~/hey-api"
import type { SongRelationType as SongRelationTypeLookup } from "~/hey-api"

import type { SongFormStore } from "./types"

type Props = {
	of: SongFormStore
	class?: string
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
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">{t`Relations`}</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addRelation}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "relations"] })}
			/>
			<ul class="flex min-h-32 flex-col gap-2">
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
		<li class="grid grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)_auto] gap-x-2 gap-y-1">
			<div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
				<Show
					when={props.songRef?.title}
					fallback={<span class="text-tertiary">{t`Select song`}</span>}
				>
					{(value) => <span class="text-primary">{value()}</span>}
				</Show>
				<SongSearchDialog
					onSelect={props.onSelectSong}
					dataFilter={dataFilter()}
					icon={<Pencil1Icon class="size-4" />}
				/>
			</div>
			<Field
				of={props.of}
				path={["data", "relations", props.index, "relation_type_id"]}
			>
				{(field) => (
					<div class="flex flex-col">
						<Select.Root<string>
							name={field.props.name}
							class="w-full"
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
							<Select.Trigger class="w-full">
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
					<div class="flex flex-col">
						<input
							{...field.props}
							class="h-9 w-full rounded-md border border-slate-300 px-3 text-sm text-primary"
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
				variant="Tertiary"
				onClick={props.onRemove}
				class="aspect-square"
			>
				<Cross1Icon class="mx-auto" />
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
						<ul class="col-span-4 grid grid-cols-subgrid">
							<FormComp.ErrorList errors={field.errors} />
						</ul>
					</>
				)}
			</Field>
		</li>
	)
}
