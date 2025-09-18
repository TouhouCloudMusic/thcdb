import { Field, getErrors, insert, remove, setInput } from "@formisch/solid"
import type { CreditRoleRef, SimpleArtist, SongCredit } from "@thc/api"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, PlusIcon, Pencil1Icon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import {
	ArtistSearchDialog,
	CreditRoleSearchDialog,
} from "~/component/form/SearchDialog"

import type { SongFormStore } from "./types"

export function SongCreditsField(props: {
	of: SongFormStore
	initCredits?: SongCredit[]
	class?: string
}) {
	const [meta, setMeta] = createStore<CreditMeta[]>(
		props.initCredits?.map((credit) => ({
			artist: credit.artist,
			role: credit.role ?? undefined,
		})) ?? [],
	)

	const addCredit = () => {
		insert(props.of, {
			path: ["data", "credits"],
		})
		setMeta(meta.length, {})
	}

	const removeCreditAt = (idx: number) => () => {
		remove(props.of, { path: ["data", "credits"], at: idx })
		setMeta((list) => list.toSpliced(idx, 1))
	}

	const setArtistAt = (idx: number) => (artist: SimpleArtist) => {
		setMeta(idx, (entry) => ({ ...entry, artist }))
		setInput(props.of, {
			path: ["data", "credits", idx, "artist_id"],
			input: artist.id,
		})
	}

	const setRoleAt = (idx: number) => (role: CreditRoleRef) => {
		setMeta(idx, (entry) => ({ ...entry, role }))
		setInput(props.of, {
			path: ["data", "credits", idx, "role_id"],
			input: role.id,
		})
	}

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">Credits</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addCredit}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "credits"] })}
			/>
			<ul class="flex min-h-32 flex-col gap-2">
				<For
					each={meta}
					fallback={<FieldArrayFallback />}
				>
					{(_, idx) => (
						<CreditRow
							of={props.of}
							entry={meta[idx()]}
							index={idx()}
							onSelectArtist={setArtistAt(idx())}
							onSelectRole={setRoleAt(idx())}
							onRemove={removeCreditAt(idx())}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}

function CreditRow(props: {
	of: SongFormStore
	entry: CreditMeta | undefined
	index: number
	onSelectArtist: (artist: SimpleArtist) => void
	onSelectRole: (role: CreditRoleRef) => void
	onRemove: () => void
}) {
	return (
		<li class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-2 gap-y-1">
			<div class="grid grid-cols-[1fr_auto] items-center gap-x-2">
				<CreditEntityLabel
					placeholder="Select artist"
					value={props.entry?.artist?.name}
				/>
				<ArtistSearchDialog
					onSelect={props.onSelectArtist}
					icon={<Pencil1Icon class="size-4" />}
				/>
			</div>
			<div class="grid grid-cols-[1fr_auto] items-center gap-x-2">
				<CreditEntityLabel
					placeholder="Select role"
					value={props.entry?.role?.name}
				/>
				<CreditRoleSearchDialog
					onSelect={props.onSelectRole}
					icon={<Pencil1Icon class="size-4" />}
				/>
			</div>
			<Button
				variant="Tertiary"
				onClick={props.onRemove}
				class="aspect-square"
			>
				<Cross1Icon class="mx-auto" />
			</Button>
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
						<ul class="grid grid-cols-subgrid">
							<FormComp.ErrorList errors={field.errors} />
						</ul>
					</>
				)}
			</Field>
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
						<ul class="grid grid-cols-subgrid">
							<FormComp.ErrorList errors={field.errors} />
						</ul>
					</>
				)}
			</Field>
		</li>
	)
}

type CreditMeta = {
	artist?: SimpleArtist
	role?: CreditRoleRef
}

function CreditEntityLabel(props: { value?: string; placeholder: string }) {
	return (
		<Show
			when={props.value}
			fallback={<span class="text-tertiary">{props.placeholder}</span>}
		>
			{(val) => <span class="text-primary">{val()}</span>}
		</Show>
	)
}
