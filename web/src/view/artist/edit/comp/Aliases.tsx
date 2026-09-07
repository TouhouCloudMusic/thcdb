import { Field, getInput, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { createMemo, untrack } from "solid-js"
import { createStore, produce } from "solid-js/store"

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
	entry: {
		display: "grid",
		height: "fit-content",
		gridTemplateColumns: "1fr auto",
	},
})

type ArtistRef = Pick<Artist, "id" | "name">

export function ArtistFormAliasesField(props: {
	styles?: StyleXStyles
	initAliasIds?: number[]
}) {
	const { t } = useLingui()
	const context = useArtistForm()
	const { formStore } = context
	const [aliases, setAliases] = createStore<ArtistRef[]>(
		untrack(() =>
			(props.initAliasIds ?? []).map((id) => ({ id, name: `#${id}` })),
		),
	)

	const handleSelect = (artist: Artist) => {
		if (aliases.some((x) => x.id == artist.id)) return

		setAliases(
			produce((s) => {
				s.push(artist)
			}),
		)

		insert(formStore, { path: ["data", "aliases"], initialInput: artist.id })
	}

	const handleRemove = (idx: number) => {
		setAliases(
			produce((s) => {
				s.splice(idx, 1)
			}),
		)
		remove(formStore, { path: ["data", "aliases"], at: idx })
	}

	const filter = createMemo<ArtistCommonFilter>(() => {
		const exclusion = aliases.map((x) => x.id)
		if (context.artistId !== undefined) {
			exclusion.push(context.artistId)
		}
		const ty = getInput(formStore, { path: ["data", "artist_type"] })
		const artist_type = ty ? [ty] : undefined
		return {
			artist_type,
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
						onSelect={handleSelect}
						queryFilter={filter()}
						icon={<PlusIcon {...stylex.attrs(styles.actionIcon)} />}
					/>
				</div>
			</div>
			<ul {...stylex.attrs(styles.entries)}>
				<Intersperse
					of={aliases}
					with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					fallback={<FieldArrayFallback />}
				>
					{(alias, idx) => (
						<AliasListItem
							index={idx()}
							onRemove={() => handleRemove(idx())}
							artist={alias}
						/>
					)}
				</Intersperse>
			</ul>
		</div>
	)
}

type AliasListItemProps = {
	index: number
	onRemove: () => void
	artist: ArtistRef
}

function AliasListItem(props: AliasListItemProps) {
	const { formStore } = useArtistForm()

	return (
		<li {...stylex.attrs(styles.entry)}>
			<Field
				of={formStore}
				path={["data", "aliases", props.index]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? props.artist.id}
						/>
						<div>{props.artist.name}</div>
					</>
				)}
			</Field>

			<Button
				onClick={props.onRemove}
				appearance="ghost"
				tone="gray"
				size="sm"
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}
