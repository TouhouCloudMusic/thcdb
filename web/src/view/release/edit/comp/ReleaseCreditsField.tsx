import { Field, getInput, insert, remove, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ReleaseCredit, SimpleArtist } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { pick } from "@thc/toolkit/data"
import type { JSX } from "solid-js"
import { createMemo, For, untrack } from "solid-js"
import { createStore } from "solid-js/store"

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

import { ArtistInfo, CreditRoleInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
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

function createReleaseCreditsState(p: {
	of: ReleaseFormStore
	initCredits?: ReleaseCredit[]
}) {
	const [meta, setMeta] = createStore(
		untrack(() => p.initCredits?.map(pick(["artist", "role"])) ?? []),
	)

	const addCreditRow = () => {
		insert(p.of, { path: ["data", "credits"], initialInput: {} })
		setMeta(meta.length, {})
	}

	const removeCreditRowAt = (idx: number) => {
		remove(p.of, { path: ["data", "credits"], at: idx })
		setMeta((list) => list.toSpliced(idx, 1))
	}

	const setCreditArtistAt = (idx: number, a: SimpleArtist) => {
		setMeta(idx, (row) => ({ ...row, artist: a }))
		setInput(p.of, {
			path: ["data", "credits", idx, "artist_id"],
			input: a.id,
		})
	}

	const setCreditRoleAt = (idx: number, r: { id: number; name: string }) => {
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
	const { t } = useLingui()
	return (
		<>
			{props.artist ? (
				<ArtistInfo value={props.artist} />
			) : (
				<span {...stylex.attrs(styles.placeholder)}>{t`Select artist`}</span>
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
			<ArtistSearchDialog
				onSelect={props.onSelectArtist}
				icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
			/>
		</>
	)
}

function ReleaseCreditRole(props: {
	of: ReleaseFormStore
	role?: { id: number; name: string }
	index: number
	onSelectRole: (r: { id: number; name: string }) => void
}): JSX.Element {
	const { t } = useLingui()
	return (
		<>
			{props.role ? (
				<CreditRoleInfo value={props.role} />
			) : (
				<span {...stylex.attrs(styles.placeholder)}>{t`Select role`}</span>
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
			<CreditRoleSearchDialog
				onSelect={props.onSelectRole}
				icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
			/>
		</>
	)
}

function ReleaseCreditTracks(props: {
	of: ReleaseFormStore
	index: number
	sortedTrackIndices: number[]
}): JSX.Element {
	const { t } = useLingui()
	const renderTrackLabel = (tIndex: number) => {
		const tracks = getInput(props.of, { path: ["data", "tracks"] })
		const discIndex = tracks[tIndex]?.disc_index ?? 0
		let withinDisc = 0
		for (let i = 0; i <= tIndex; i += 1) {
			if (tracks[i]?.disc_index === discIndex) withinDisc += 1
		}
		return `Disc ${discIndex + 1} Track ${withinDisc}`
	}

	const currValue = () =>
		getInput(props.of, {
			path: ["data", "credits", props.index, "on"],
		})

	const getChecked = (idx: number) => currValue()?.includes(idx) ?? false
	const updateInput = (
		idx: number,
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
		<div {...stylex.attrs(styles.tracks)}>
			<label {...stylex.attrs(formStyles.label)}>{t`On Tracks`}</label>
			<For each={props.sortedTrackIndices}>
				{(trackIdx) => (
					<label {...stylex.attrs(styles.trackLabel)}>
						<input
							checked={getChecked(trackIdx)}
							onChange={(e) => updateInput(trackIdx, e)}
							{...stylex.attrs(styles.checkbox)}
							type="checkbox"
							aria-label={renderTrackLabel(trackIdx)}
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
		<li {...stylex.attrs(styles.item)}>
			<div {...stylex.attrs(styles.controls)}>
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
					onClick={props.onRemove}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={styles.removeButton}
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
	styles?: StyleXStyles
}): JSX.Element {
	const { t } = useLingui()
	const {
		meta,
		addCreditRow,
		removeCreditRowAt,
		setCreditArtistAt,
		setCreditRoleAt,
	} = createReleaseCreditsState({
		of: untrack(() => props.of),
		initCredits: untrack(() => props.initCredits),
	})

	const creditRows = createMemo(() =>
		getInput(props.of, { path: ["data", "credits"] }),
	)

	const sortedTrackIndices = createMemo(() => {
		const tracks = getInput(props.of, { path: ["data", "tracks"] })

		const counters = new Map<number, number>()
		const within = tracks.map((track) => {
			const discIdx = track.disc_index ?? 0
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
							onRemove={() => removeCreditRowAt(idx())}
							onSelectArtist={(artist) => setCreditArtistAt(idx(), artist)}
							onSelectRole={(role) => setCreditRoleAt(idx(), role)}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
