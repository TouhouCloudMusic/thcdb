import { FieldArray, getInput, insert, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ReleaseTrack } from "@thc/api"
import {
	PlusIcon,
	Pencil1Icon,
	ArrowLeftIcon,
	ArrowRightIcon,
} from "@thc/icons/radix"
import { For, createMemo, createSignal } from "solid-js"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { Dialog } from "~/component/dialog"
import type { NewDisc } from "~/domain/release"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

import { TrackItem } from "./TrackFieldItem"
import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	inputSpacing: {
		marginBlockStart: 0,
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	field: { display: "flex", flexDirection: "column" },
	list: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[16],
	},
	emptyTrack: {
		display: "flex",
		height: px[128],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.sm,
		color: colors.textSecondary,
	},
	track: {
		display: "grid",
		gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
		gap: px[8],
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[400],
		padding: px[12],
	},
	header: {
		marginBottom: px[16],
		display: "flex",
		flexDirection: "column",
		gap: px[8],
	},
	heading: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	label: { margin: "0rem" },
	addTrackButton: { height: "max-content", padding: px[8] },
	icon: { width: px[16], height: px[16] },
	navigation: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[8],
	},
	previousDiscButton: { height: "max-content", padding: px[8] },
	discActions: { display: "flex", alignItems: "center", gap: px[8] },
	discName: {
		borderRadius: radius.sm,
		paddingInline: px[8],
		lineHeight: 1,
		color: colors.textPrimary,
	},
	defaultDiscName: { color: colors.textTertiary },
	addDiscButton: { padding: px[8] },
	nextDiscButton: { padding: px[8] },
	renameTrigger: { height: "100%", padding: px[8] },
	renameDialog: {
		width: "100%",
		maxWidth: px[384],
		borderRadius: radius.sm,
		padding: px[16],
	},
	renameTitle: { fontSize: fontSizes.lg, lineHeight: lineHeights.lg },
	renameInput: { marginTop: px[16] },
	renameActions: {
		marginTop: px[16],
		display: "flex",
		justifyContent: "flex-end",
		gap: px[8],
	},
})

export function ReleaseTracksField(props: {
	of: ReleaseFormStore
	initTracks?: ReleaseTrack[]
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const [selectedDisc, setSelectedDisc] = createSignal(0)

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
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
						<ul {...stylex.attrs(styles.list)}>
							<For
								each={visibleTrackIndices()}
								fallback={
									<li {...stylex.attrs(styles.emptyTrack)}>
										{t`No tracks under this disc.`}
									</li>
								}
							>
								{(trackIdx) => (
									<li {...stylex.attrs(styles.track)}>
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

function TrackHeader(props: {
	of: ReleaseFormStore
	selectedDisc: () => number
	setSelectedDisc: (n: number) => void
}) {
	const { t } = useLingui()
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
		if (d?.name && d.name.length > 0) return d.name
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
		<div {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.heading)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Tracks`}</label>
				<Button
					appearance="ghost"
					tone="gray"
					styles={styles.addTrackButton}
					onClick={onAddTrack}
					title={t`Add track`}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<div {...stylex.attrs(styles.navigation)}>
				<Button
					appearance="ghost"
					tone="gray"
					styles={styles.previousDiscButton}
					onClick={onPrevDisc}
					title={t`Previous disc`}
				>
					<ArrowLeftIcon {...stylex.attrs(styles.icon)} />
				</Button>
				<div {...stylex.attrs(styles.discActions)}>
					<div
						{...stylex.attrs(
							styles.discName,
							isDefaultName() && styles.defaultDiscName,
						)}
					>
						{currentDiscName()} {isDefaultName() && "(default)"}
					</div>
					<EditDiscNameDialog
						currentName={currentDiscName}
						onConfirm={onConfirmRename}
					/>
					<Button
						appearance="ghost"
						tone="gray"
						size="sm"
						styles={styles.addDiscButton}
						onClick={onAddDisc}
						title={t`Add disc`}
					>
						<PlusIcon {...stylex.attrs(styles.icon)} />
					</Button>
				</div>
				<Button
					appearance="ghost"
					tone="gray"
					styles={styles.nextDiscButton}
					onClick={onNextDisc}
					title={t`Next disc`}
				>
					<ArrowRightIcon {...stylex.attrs(styles.icon)} />
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
	const { t } = useLingui()
	const [open, setOpen] = createSignal(false)
	const [name, setName] = createSignal("")

	const syncOpen = (state: boolean) => {
		setOpen(state)
		if (state) {
			const initial = props.currentName().trim()
			setName(initial)
		}
	}

	const confirm = () => {
		const next = name().trim()
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
				appearance="ghost"
				tone="gray"
				size="sm"
				styles={styles.renameTrigger}
				title={t`Rename disc`}
			>
				<Pencil1Icon {...stylex.attrs(styles.icon)} />
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content styles={styles.renameDialog}>
					<Dialog.Title
						styles={styles.renameTitle}
					>{t`Rename Disc`}</Dialog.Title>
					<div {...stylex.attrs(styles.renameInput)}>
						<InputField.Root styles={styles.inputSpacing}>
							<InputField.Input
								placeholder={t`Disc name`}
								value={name()}
								onInput={(e) => {
									const value = e.currentTarget.value
									setName(value)
								}}
							/>
						</InputField.Root>
					</div>
					<div {...stylex.attrs(styles.renameActions)}>
						<Dialog.CloseButton
							as={Button}
							appearance="ghost"
							tone="gray"
						>
							{t`Cancel`}
						</Dialog.CloseButton>
						<Button
							appearance="solid"
							tone="reimu"
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
