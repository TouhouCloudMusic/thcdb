import { Field, getInput, insert, remove, setInput } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { ReleaseCredit, SimpleArtist } from "@thc/api"
import { pick } from "@thc/toolkit/data"
import type { JSX } from "solid-js"
import { createMemo, For } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form/FieldArrayFallback"
import {
	ArtistSearchDialog,
	CreditRoleSearchDialog,
} from "~/component/form/SearchDialog"

import { ArtistInfo, CreditRoleInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

function createReleaseCreditsState(p: {
	of: ReleaseFormStore
	initCredits?: ReleaseCredit[]
}) {
	const [meta, setMeta] = createStore(
		p.initCredits?.map(pick(["artist", "role"])) ?? [],
	)

	const addCreditRow = () => {
		insert(p.of, { path: ["data", "credits"], initialInput: {} })
		setMeta(meta.length, {})
	}

	const removeCreditRowAt = (idx: number) => () => {
		remove(p.of, { path: ["data", "credits"], at: idx })
		setMeta((list) => list.toSpliced(idx, 1))
	}

	const setCreditArtistAt = (idx: number) => (a: SimpleArtist) => {
		setMeta(idx, (row) => ({ ...row, artist: a }))
		setInput(p.of, {
			path: ["data", "credits", idx, "artist_id"],
			input: a.id,
		})
	}

	const setCreditRoleAt =
		(idx: number) => (r: { id: number; name: string }) => {
			setMeta(idx, (row) => ({ ...row, role: r }))
			setInput(p.of, {
				path: ["data", "credits", idx, "role_id"],
				input: r.id,
			})
		}

	return {
		meta,
		addCreditRow,
		removeCreditRowAt,
		setCreditArtistAt,
		setCreditRoleAt,
	}
}

function ReleaseCreditArtist(props: {
	of: ReleaseFormStore
	artist?: SimpleArtist
	index: number
	onSelectArtist: (a: SimpleArtist) => void
}): JSX.Element {
	return (
		<>
			{props.artist ? (
				<ArtistInfo value={props.artist} />
			) : (
				<span class="text-tertiary">Select artist</span>
			)}

			<Field
				of={props.of}
				path={["data", "credits", props.index, "artist_id"]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? undefined}
						/>

						<For each={field.errors}>
							{(error) => (
								<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
							)}
						</For>
					</>
				)}
			</Field>
			<ArtistSearchDialog onSelect={props.onSelectArtist} />
		</>
	)
}

function ReleaseCreditRole(props: {
	of: ReleaseFormStore
	role?: { id: number; name: string }
	index: number
	onSelectRole: (r: { id: number; name: string }) => void
}): JSX.Element {
	return (
		<>
			{props.role ? (
				<CreditRoleInfo value={props.role} />
			) : (
				<span class="text-tertiary">Select role</span>
			)}
			<Field
				of={props.of}
				path={["data", "credits", props.index, "role_id"]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? undefined}
						/>
						<For each={field.errors}>
							{(error) => (
								<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
							)}
						</For>
					</>
				)}
			</Field>
			<CreditRoleSearchDialog onSelect={props.onSelectRole} />
		</>
	)
}

function ReleaseCreditTracks(props: {
	of: ReleaseFormStore
	index: number
	sortedTrackIndices: number[]
}): JSX.Element {
	const renderTrackLabel = (tIndex: number) => {
		const tracks = getInput(props.of, { path: ["data", "tracks"] })
		const discIndex = tracks[tIndex]?.disc_index ?? 0
		let withinDisc = 0
		for (let i = 0; i <= tIndex; i += 1) {
			if (tracks[i]?.disc_index === discIndex) withinDisc += 1
		}
		return `Disc ${discIndex + 1} Track ${withinDisc}`
	}

	let currValue = () =>
		getInput(props.of, {
			path: ["data", "credits", props.index, "on"],
		})

	let getChecked = (idx: number) => currValue()?.includes(idx) ?? false
	let updateInput =
		(idx: number) =>
		(
			e: Event & {
				currentTarget: HTMLInputElement
				target: HTMLInputElement
			},
		) => {
			let prev = currValue() ?? []

			if (e.currentTarget.checked) {
				if (prev.includes(idx)) return
				prev.push(idx)
			} else {
				if (!prev.includes(idx)) return
				prev = prev.filter((i) => i !== idx)
			}
			setInput(props.of, {
				path: ["data", "credits", props.index, "on"],
				input: prev,
			})
		}

	return (
		<div class="flex flex-col gap-1">
			<FormComp.Label>On Tracks</FormComp.Label>
			<For each={props.sortedTrackIndices}>
				{(trackIdx) => (
					<label class="flex items-center gap-2 text-sm">
						<input
							checked={getChecked(trackIdx)}
							onChange={updateInput(trackIdx)}
							class="h-4 w-4"
							type="checkbox"
						/>
						<span>{renderTrackLabel(trackIdx)}</span>
					</label>
				)}
			</For>
		</div>
	)
}

function ReleaseCreditItem(props: {
	of: ReleaseFormStore
	artist?: SimpleArtist
	role?: { id: number; name: string }
	index: number
	sortedTrackIndices: number[]
	onRemove: () => void
	onSelectArtist: (a: { id: number; name: string }) => void
	onSelectRole: (r: { id: number; name: string }) => void
}): JSX.Element {
	return (
		<li class="grid grid-cols-1 gap-2 rounded border border-slate-200 p-3">
			<div class="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2">
				<ReleaseCreditArtist
					of={props.of}
					artist={props.artist}
					index={props.index}
					onSelectArtist={props.onSelectArtist}
				/>
				<ReleaseCreditRole
					of={props.of}
					role={props.role}
					index={props.index}
					onSelectRole={props.onSelectRole}
				/>
				<Button
					variant="Tertiary"
					size="Sm"
					class="h-full p-2"
					onClick={props.onRemove}
				>
					<Cross1Icon />
				</Button>
			</div>

			<ReleaseCreditTracks
				of={props.of}
				index={props.index}
				sortedTrackIndices={props.sortedTrackIndices}
			/>
		</li>
	)
}

export function ReleaseCreditsField(props: {
	of: ReleaseFormStore
	initCredits?: ReleaseCredit[]
	class?: string
}): JSX.Element {
	const {
		meta,
		addCreditRow,
		removeCreditRowAt,
		setCreditArtistAt,
		setCreditRoleAt,
	} = createReleaseCreditsState({
		of: props.of,
		initCredits: props.initCredits,
	})

	const creditRows = createMemo(
		() => getInput(props.of, { path: ["data", "credits"] }) ?? [],
	)

	const sortedTrackIndices = createMemo(() => {
		const tracks = getInput(props.of, { path: ["data", "tracks"] })

		const counters = new Map<number, number>()
		const within = tracks.map((t) => {
			const discIdx = t?.disc_index ?? 0
			const currIdx = counters.get(discIdx) ?? 0
			counters.set(discIdx, currIdx + 1)
			return currIdx + 1
		})
		return tracks
			.map((_, i) => i)
			.toSorted((a, b) => {
				const da = tracks[a]?.disc_index ?? 0
				const db = tracks[b]?.disc_index ?? 0
				if (da !== db) return da - db
				return within[a]! - within[b]!
			})
	})

	return (
		<div class={twMerge("flex min-h-32 w-full flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Credits</Trans>
				</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addCreditRow}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<ul class="flex h-full flex-col gap-4">
				<For
					each={creditRows()}
					fallback={<FieldArrayFallback />}
				>
					{(_, idx) => (
						<ReleaseCreditItem
							of={props.of}
							artist={meta[idx()]?.artist}
							role={meta[idx()]?.role}
							index={idx()}
							sortedTrackIndices={sortedTrackIndices()}
							onRemove={removeCreditRowAt(idx())}
							onSelectArtist={setCreditArtistAt(idx())}
							onSelectRole={setCreditRoleAt(idx())}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
