import { FieldArray, getInput, insert, setInput } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { ReleaseTrack } from "@thc/api"
import { For, createMemo, createSignal } from "solid-js"
import {
	PlusIcon,
	Pencil1Icon,
	ArrowLeftIcon,
	ArrowRightIcon,
} from "solid-radix-icons"
import { twJoin } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { Dialog } from "~/component/dialog"
import type { NewDisc } from "~/domain/release"

import { TrackItem } from "./TrackFieldItem"
import type { ReleaseFormStore } from "./types"

export function ReleaseTracksField(props: {
	of: ReleaseFormStore
	initTracks?: ReleaseTrack[]
	class?: string
}) {
	const [selectedDisc, setSelectedDisc] = createSignal(0)

	return (
		<div class={twJoin("flex flex-col", props.class)}>
			<TrackHeader
				of={props.of}
				selectedDisc={selectedDisc}
				setSelectedDisc={setSelectedDisc}
			/>
			<FieldArray
				of={props.of}
				path={["data", "tracks"]}
			>
				{(fa) => {
					const visibleTrackIndices = createMemo(() => {
						const items = fa.items
						return items
							.map((_, i) => i)
							.filter((i) => {
								const di = getInput(props.of, {
									path: ["data", "tracks", i, "disc_index"],
								})
								return di === selectedDisc()
							})
					})

					return (
						<ul class="flex h-full flex-col gap-4">
							<For
								each={visibleTrackIndices()}
								fallback={
									<li class="flex h-32 items-center justify-center rounded text-secondary">
										<Trans>No tracks under this disc.</Trans>
									</li>
								}
							>
								{(trackIdx) => (
									<li class="grid grid-cols-1 gap-2 rounded border border-slate-400 p-3">
										<TrackItem
											index={trackIdx}
											of={props.of}
											initTrack={props.initTracks?.[trackIdx]}
										/>
									</li>
								)}
							</For>
						</ul>
					)
				}}
			</FieldArray>
		</div>
	)
}

// oxlint-disable-next-line max-lines-per-function
function TrackHeader(props: {
	of: ReleaseFormStore
	selectedDisc: () => number
	setSelectedDisc: (n: number) => void
}) {
	const discs = createMemo(() =>
		getInput(props.of, { path: ["data", "discs"] }),
	)
	const discCount = createMemo(() => discs().length)

	const onAddTrack = () => {
		if (discCount() === 0) {
			const initialDisc: NewDisc = { name: "" }
			insert(props.of, { path: ["data", "discs"], initialInput: initialDisc })
			props.setSelectedDisc(0)
		}
		insert(props.of, {
			path: ["data", "tracks"],
			initialInput: { disc_index: props.selectedDisc() },
		})
	}

	const currentDiscName = createMemo(() => {
		const d = discs()[props.selectedDisc()]
		if (d && d.name && d.name.length > 0) return d.name
		return `Disc ${props.selectedDisc() + 1}`
	})

	const isDefaultName = createMemo(() => {
		return !discs()[props.selectedDisc()]?.name
	})

	const onPrevDisc = () => {
		if (discCount() === 0) return
		props.setSelectedDisc(
			(props.selectedDisc() - 1 + discCount()) % discCount(),
		)
	}

	const onNextDisc = () => {
		if (discCount() === 0) return
		props.setSelectedDisc((props.selectedDisc() + 1) % discCount())
	}

	const onAddDisc = () => {
		const nextIndex = discCount()
		const initial: NewDisc = { name: "" }
		insert(props.of, { path: ["data", "discs"], initialInput: initial })
		props.setSelectedDisc(nextIndex)
	}

	const onConfirmRename = (next: string) => {
		if (currentDiscName() === next) return
		setInput(props.of, {
			path: ["data", "discs", props.selectedDisc(), "name"],
			input: next,
		})
	}

	return (
		<div class="mb-4 flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<FormComp.Label class="m-0">
					<Trans>Tracks</Trans>
				</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={onAddTrack}
					title="Add track"
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<div class="flex items-center justify-between gap-2">
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={onPrevDisc}
					title="Previous disc"
				>
					<ArrowLeftIcon class="size-4" />
				</Button>
				<div class="flex items-center gap-2">
					<div
						class={twJoin(
							"rounded px-2 leading-none text-primary",
							isDefaultName() && "text-tertiary",
						)}
					>
						{currentDiscName()} {isDefaultName() && "(default)"}
					</div>
					<EditDiscNameDialog
						currentName={currentDiscName}
						onConfirm={onConfirmRename}
					/>
					<Button
						variant="Tertiary"
						size="Sm"
						onClick={onAddDisc}
						class="p-2"
						title="Add disc"
					>
						<PlusIcon class="size-4" />
					</Button>
				</div>
				<Button
					variant="Tertiary"
					class="p-2"
					onClick={onNextDisc}
					title="Next disc"
				>
					<ArrowRightIcon class="size-4" />
				</Button>
			</div>
		</div>
	)
}

type DiscNameDialogProps = {
	currentName: () => string
	onConfirm: (name: string) => void
}

function EditDiscNameDialog(props: DiscNameDialogProps) {
	let [open, setOpen] = createSignal(false)
	let [name, setName] = createSignal("")

	let syncOpen = (state: boolean) => {
		setOpen(state)
		if (state) {
			let initial = props.currentName().trim()
			setName(initial)
		}
	}

	let confirm = () => {
		let next = name().trim()
		props.onConfirm(next)
		setOpen(false)
	}

	return (
		<Dialog.Root
			open={open()}
			onOpenChange={syncOpen}
		>
			<Dialog.Trigger
				as={Button}
				variant="Tertiary"
				class="h-full p-2"
				size="Sm"
				title="Rename disc"
			>
				<Pencil1Icon class="size-4" />
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content class="w-full max-w-sm rounded p-4">
					<Dialog.Title class="text-lg">Rename Disc</Dialog.Title>
					<div class="mt-4 space-y-2">
						<InputField.Root>
							<InputField.Input
								placeholder="Disc name"
								value={name()}
								onInput={(e: Event) => {
									let value = (e.target as HTMLInputElement).value
									setName(value)
								}}
							/>
						</InputField.Root>
					</div>
					<div class="mt-4 flex justify-end gap-2">
						<Dialog.CloseButton variant="Tertiary">Cancel</Dialog.CloseButton>
						<Button
							variant="Primary"
							color="Reimu"
							onClick={confirm}
						>
							Confirm
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

// Track item related components moved to ./TrackFieldItem
