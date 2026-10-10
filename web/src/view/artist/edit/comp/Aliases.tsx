import {
	getInput,
	insert,
	remove,
	useField,
	useFieldArray,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { Artist } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { Nil } from "@thc/toolkit/data"
import { createMemo } from "solid-js"

import { Button } from "~/component/atomic/button"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles, formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useArtistForm } from "../context"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
		width: px[384],
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
	actionIcon: {
		width: px[16],
		height: px[16],
		color: palette.slate[600],
	},
	entries: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
	},
})

const rowStyles = stylex.create({
	entry: {
		display: "grid",
		height: "fit-content",
		gridTemplateColumns: "1fr auto",
	},
})

function AliasRow(props: { index: number }) {
	const { formStore } = useArtistForm()

	const field = useField(formStore, () => ({
		path: ["data", "aliases", props.index],
	}))

	const removeAlias = () =>
		remove(formStore, {
			path: ["data", "aliases"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.entry)}>
			<div>{field.input?.name}</div>
			<Button
				onClick={removeAlias}
				appearance="ghost"
				tone="gray"
				size="sm"
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

export function ArtistFormAliasesField(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const context = useArtistForm()
	const { formStore } = context

	const aliases = useFieldArray(formStore, {
		path: ["data", "aliases"],
	})

	const isAvailableArtist = (artist: Artist) =>
		artist.id !== context.artistId
		&& !getInput(formStore, { path: aliases.path }).some(
			(alias) => alias.id === artist.id,
		)

	const addAlias = (artist: Artist) => {
		if (!isAvailableArtist(artist)) return

		insert(formStore, { path: aliases.path, initialInput: artist })
	}

	const artistSearchFilter = createMemo(() => {
		const exclusion = getInput(formStore, { path: aliases.path }).map(
			(alias) => alias.id,
		)

		if (context.artistId !== undefined) exclusion.push(context.artistId)

		const type = getInput(formStore, { path: ["data", "artist_type"] })

		return {
			artist_type: Nil.map((value) => [value], type),
			exclusion,
		}
	})

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Aliases`}</label>
				<div {...stylex.attrs(styles.actions)}>
					<ArtistSearchDialog
						onSelect={addAlias}
						queryFilter={artistSearchFilter()}
						filter={isAvailableArtist}
						icon={<PlusIcon {...stylex.attrs(styles.actionIcon)} />}
					/>
				</div>
			</div>
			<ul {...stylex.attrs(styles.entries)}>
				<Intersperse
					of={aliases.items}
					with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => <AliasRow index={index()} />}
				</Intersperse>
			</ul>
		</div>
	)
}
