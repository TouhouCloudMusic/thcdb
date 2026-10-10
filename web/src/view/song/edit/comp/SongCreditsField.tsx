import { useFieldArray, insert, remove, useField } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon, Pencil1Icon } from "@thc/icons/radix"
import { For, Show } from "solid-js"

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
})

const rowStyles = stylex.create({
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

function CreditRow(props: { of: SongFormStore; index: number }) {
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
	const removeCredit = () =>
		remove(props.of, {
			path: ["data", "credits"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.entry)}>
			<div {...stylex.attrs(rowStyles.selection)}>
				<CreditEntityLabel
					placeholder={t`Select artist`}
					value={artist.input?.name}
				/>
				<ArtistSearchDialog
					onSelect={artist.onInput}
					icon={<Pencil1Icon {...stylex.attrs(styles.icon)} />}
				/>
			</div>
			<div {...stylex.attrs(rowStyles.selection)}>
				<CreditEntityLabel
					placeholder={t`Select role`}
					value={role.input?.name}
				/>
				<CreditRoleSearchDialog
					onSelect={role.onInput}
					icon={<Pencil1Icon {...stylex.attrs(styles.icon)} />}
				/>
			</div>
			<Button
				onClick={removeCredit}
				appearance="ghost"
				tone="gray"
				styles={rowStyles.removeButton}
			>
				<Cross1Icon {...stylex.attrs(rowStyles.removeIcon)} />
			</Button>
			<ul {...stylex.attrs(rowStyles.errors)}>
				<FormComp.ErrorList errors={artist.errors} />
			</ul>
			<ul {...stylex.attrs(rowStyles.errors)}>
				<FormComp.ErrorList errors={role.errors} />
			</ul>
		</li>
	)
}

export function SongCreditsField(props: {
	of: SongFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const credits = useFieldArray(() => props.of, { path: ["data", "credits"] })

	const addCredit = () => {
		insert(props.of, {
			path: credits.path,
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
			<FormComp.ErrorList errors={credits.errors} />
			<ul {...stylex.attrs(styles.entries)}>
				<For
					each={credits.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<CreditRow
							of={props.of}
							index={index()}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}

function CreditEntityLabel(props: { value?: string; placeholder: string }) {
	return (
		<Show
			when={props.value}
			fallback={
				<span {...stylex.attrs(rowStyles.placeholder)}>
					{props.placeholder}
				</span>
			}
		>
			{(val) => <span {...stylex.attrs(rowStyles.value)}>{val()}</span>}
		</Show>
	)
}
