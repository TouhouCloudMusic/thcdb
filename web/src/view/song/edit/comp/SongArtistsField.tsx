import {
	getInput,
	useField,
	useFieldArray,
	insert,
	remove,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { SimpleArtist } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"
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
	actions: {
		display: "flex",
		gap: px[8],
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
		gridTemplateColumns: "minmax(0,1fr) auto",
		alignItems: "center",
		gap: px[8],
	},
	value: {
		color: colors.textPrimary,
	},
	entryActions: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
	},
	removeButton: {
		aspectRatio: "1 / 1",
	},
	removeIcon: {
		marginInline: "auto",
	},
})

function ArtistRow(props: { of: SongFormStore; index: number }) {
	const field = useField(
		() => props.of,
		() => ({
			path: ["data", "artists", props.index],
		}),
	)
	const removeArtist = () =>
		remove(props.of, {
			path: ["data", "artists"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.entry)}>
			<span {...stylex.attrs(rowStyles.value)}>{field.input?.name}</span>
			<div {...stylex.attrs(rowStyles.entryActions)}>
				<For each={field.errors}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>
				<Button
					onClick={removeArtist}
					appearance="ghost"
					tone="gray"
					styles={rowStyles.removeButton}
				>
					<Cross1Icon {...stylex.attrs(rowStyles.removeIcon)} />
				</Button>
			</div>
		</li>
	)
}

export function SongArtistsField(props: {
	of: SongFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const artists = useFieldArray(() => props.of, { path: ["data", "artists"] })

	const isAvailableArtist = (artist: SimpleArtist) =>
		!getInput(props.of, { path: artists.path }).some(
			(selected) => selected.id === artist.id,
		)

	const addArtist = (artist: SimpleArtist) => {
		if (!isAvailableArtist(artist)) return

		insert(props.of, { path: artists.path, initialInput: artist })
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Artists`}</label>
				<div {...stylex.attrs(styles.actions)}>
					<ArtistSearchDialog
						onSelect={addArtist}
						filter={isAvailableArtist}
						icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
					/>
				</div>
			</div>
			<FormComp.ErrorList errors={artists.errors} />
			<ul {...stylex.attrs(styles.entries)}>
				<For
					each={artists.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<ArtistRow
							of={props.of}
							index={index()}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
