import {
	getInput,
	insert,
	remove,
	useField,
	useFieldArray,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { createMemo, For, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import {
	ArtistSearchDialog,
	CreditRoleSearchDialog,
} from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

import { entityInfoStyles } from "./entityInfo.stylex"
import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
		width: "100%",
		flexDirection: "column",
	},
	header: {
		marginBottom: px[16],
		display: "flex",
		placeContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	label: { margin: "0rem" },
	addButton: { height: "max-content", padding: px[8] },
	addIcon: { width: px[16], height: px[16] },
	list: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[16],
	},
})

const rowStyles = stylex.create({
	placeholder: { color: colors.textTertiary },
	icon: { width: px[16], height: px[16], color: palette.slate[600] },
	tracks: {
		display: "flex",
		flexDirection: "column",
		gap: px[4],
	},
	trackLabel: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	checkbox: { height: px[16], width: px[16] },
	item: {
		display: "grid",
		gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
		gap: px[8],
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		padding: px[12],
	},
	controls: {
		display: "grid",
		gridTemplateColumns: "1fr auto 1fr auto auto",
		alignItems: "center",
		gap: px[8],
	},
	removeButton: { height: "100%", padding: px[8] },
})

function CreditRow(props: {
	of: ReleaseFormStore
	index: number
	renderTrackLabel: (index: number) => string
	sortedTrackIndices: number[]
}) {
	const { t } = useLingui()

	const artist = useField(
		() => props.of,
		() => ({
			path: ["data", "credits", props.index, "artist"],
		}),
	)
	const role = useField(
		() => props.of,
		() => ({
			path: ["data", "credits", props.index, "role"],
		}),
	)
	const creditTracks = useField(
		() => props.of,
		() => ({
			path: ["data", "credits", props.index, "on"],
		}),
	)

	const removeCredit = () =>
		remove(props.of, { path: ["data", "credits"], at: props.index })

	const updateTrack = (trackIndex: number, checked: boolean) => {
		const selected = creditTracks.input ?? []
		if (selected.includes(trackIndex) === checked) return

		creditTracks.onInput(
			checked
				? [...selected, trackIndex]
				: selected.filter((selectedIndex) => selectedIndex !== trackIndex),
		)
	}

	return (
		<li {...stylex.attrs(rowStyles.item)}>
			<div {...stylex.attrs(rowStyles.controls)}>
				<Show
					when={artist.input}
					fallback={
						<span
							{...stylex.attrs(rowStyles.placeholder)}
						>{t`Select artist`}</span>
					}
				>
					<span {...stylex.attrs(entityInfoStyles.name)}>
						{artist.input?.name}
					</span>
				</Show>
				<For each={artist.errors}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>
				<ArtistSearchDialog
					onSelect={artist.onInput}
					icon={<PlusIcon {...stylex.attrs(rowStyles.icon)} />}
				/>
				<Show
					when={role.input}
					fallback={
						<span
							{...stylex.attrs(rowStyles.placeholder)}
						>{t`Select role`}</span>
					}
				>
					<span {...stylex.attrs(entityInfoStyles.name)}>
						{role.input?.name}
					</span>
				</Show>
				<For each={role.errors}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>
				<CreditRoleSearchDialog
					onSelect={role.onInput}
					icon={<PlusIcon {...stylex.attrs(rowStyles.icon)} />}
				/>
				<Button
					onClick={removeCredit}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={rowStyles.removeButton}
				>
					<Cross1Icon />
				</Button>
			</div>
			<div {...stylex.attrs(rowStyles.tracks)}>
				<label {...stylex.attrs(formStyles.label)}>{t`On Tracks`}</label>
				<For each={props.sortedTrackIndices}>
					{(trackIndex) => (
						<label {...stylex.attrs(rowStyles.trackLabel)}>
							<input
								checked={creditTracks.input?.includes(trackIndex) ?? false}
								onChange={(e) =>
									updateTrack(trackIndex, e.currentTarget.checked)
								}
								{...stylex.attrs(rowStyles.checkbox)}
								type="checkbox"
								aria-label={props.renderTrackLabel(trackIndex)}
							/>
							<span>{props.renderTrackLabel(trackIndex)}</span>
						</label>
					)}
				</For>
			</div>
		</li>
	)
}

export function ReleaseCreditsField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}): JSX.Element {
	const { t } = useLingui()

	const creditRows = useFieldArray(() => props.of, {
		path: ["data", "credits"],
	})

	const addCreditRow = () => insert(props.of, { path: creditRows.path })

	const sortedTrackIndices = createMemo(() => {
		const tracks = getInput(props.of, { path: ["data", "tracks"] })

		return tracks
			.map((_, i) => i)
			.toSorted((a, b) => {
				const da = tracks[a]?.disc_index ?? 0

				const db = tracks[b]?.disc_index ?? 0
				if (da !== db) return da - db
				return a - b
			})
	})

	const renderTrackLabel = (trackIndex: number) => {
		const tracks = getInput(props.of, { path: ["data", "tracks"] })

		const discIndex = tracks[trackIndex]?.disc_index ?? 0
		let withinDisc = 0
		for (let i = 0; i <= trackIndex; i += 1) {
			if (tracks[i]?.disc_index === discIndex) withinDisc += 1
		}
		return `Disc ${discIndex + 1} Track ${withinDisc}`
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Credits`}</label>
				<Button
					onClick={addCreditRow}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.addIcon)} />
				</Button>
			</div>
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={creditRows.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<CreditRow
							of={props.of}
							index={index()}
							renderTrackLabel={renderTrackLabel}
							sortedTrackIndices={sortedTrackIndices()}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
