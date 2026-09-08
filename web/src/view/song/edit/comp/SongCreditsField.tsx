import { Field, getErrors, insert, remove, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { CreditRoleRef, SimpleArtist, SongCredit } from "@thc/api"
import { Cross1Icon, PlusIcon, Pencil1Icon } from "@thc/icons/radix"
import { For, Show, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import {
	ArtistSearchDialog,
	CreditRoleSearchDialog,
} from "~/component/form/SearchDialog"
import { formStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"

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
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
		columnGap: px[8],
		rowGap: px[4],
	},
	selection: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "center",
		columnGap: px[8],
	},
	removeButton: {
		aspectRatio: "1 / 1",
	},
	removeIcon: {
		marginInline: "auto",
	},
	errors: {
		display: "grid",
		gridTemplateColumns: "subgrid",
	},
	placeholder: {
		color: colors.textTertiary,
	},
	value: {
		color: colors.textPrimary,
	},
})

export function SongCreditsField(props: {
	of: SongFormStore
	initCredits?: SongCredit[]
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const formStore = createMemo(() => props.of)
	const [meta, setMeta] = createStore<CreditMeta[]>(
		untrack(
			() =>
				props.initCredits?.map((credit) => ({
					artist: credit.artist,
					role: credit.role ?? undefined,
				})) ?? [],
		),
	)

	const addCredit = () => {
		insert(formStore(), {
			path: ["data", "credits"],
		})
		setMeta(meta.length, {})
	}

	const removeCreditAt = (idx: number) => {
		remove(formStore(), { path: ["data", "credits"], at: idx })
		setMeta((list) => list.toSpliced(idx, 1))
	}

	const setArtistAt = (idx: number, artist: SimpleArtist) => {
		setMeta(idx, (entry) => ({ ...entry, artist }))
		setInput(formStore(), {
			path: ["data", "credits", idx, "artist_id"],
			input: artist.id,
		})
	}

	const setRoleAt = (idx: number, role: CreditRoleRef) => {
		setMeta(idx, (entry) => ({ ...entry, role }))
		setInput(formStore(), {
			path: ["data", "credits", idx, "role_id"],
			input: role.id,
		})
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Credits`}</label>
				<Button
					onClick={addCredit}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "credits"] })}
			/>
			<ul {...stylex.attrs(styles.entries)}>
				<For
					each={meta}
					fallback={<FieldArrayFallback />}
				>
					{(_, idx) => (
						<CreditRow
							of={props.of}
							entry={meta[idx()]}
							index={idx()}
							onSelectArtist={(artist) => setArtistAt(idx(), artist)}
							onSelectRole={(role) => setRoleAt(idx(), role)}
							onRemove={() => removeCreditAt(idx())}
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
	const { t } = useLingui()
	return (
		<li {...stylex.attrs(styles.entry)}>
			<div {...stylex.attrs(styles.selection)}>
				<CreditEntityLabel
					placeholder={t`Select artist`}
					value={props.entry?.artist?.name}
				/>
				<ArtistSearchDialog
					onSelect={props.onSelectArtist}
					icon={<Pencil1Icon {...stylex.attrs(styles.icon)} />}
				/>
			</div>
			<div {...stylex.attrs(styles.selection)}>
				<CreditEntityLabel
					placeholder={t`Select role`}
					value={props.entry?.role?.name}
				/>
				<CreditRoleSearchDialog
					onSelect={props.onSelectRole}
					icon={<Pencil1Icon {...stylex.attrs(styles.icon)} />}
				/>
			</div>
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
						<ul {...stylex.attrs(styles.errors)}>
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
						<ul {...stylex.attrs(styles.errors)}>
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
			fallback={
				<span {...stylex.attrs(styles.placeholder)}>{props.placeholder}</span>
			}
		>
			{(val) => <span {...stylex.attrs(styles.value)}>{val()}</span>}
		</Show>
	)
}
