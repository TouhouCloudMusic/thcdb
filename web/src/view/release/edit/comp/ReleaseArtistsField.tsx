import { Field, getErrors, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { SimpleArtist } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { ArtistInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
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
	actions: { display: "flex", gap: px[8] },
	icon: { width: px[16], height: px[16], color: palette.slate[600] },
	list: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
	},
	item: {
		display: "grid",
		height: "fit-content",
		gridTemplateColumns: "1fr auto",
	},
})

export function ReleaseArtistsField(props: {
	of: ReleaseFormStore
	initArtists?: SimpleArtist[]
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const [artists, setArtists] = createStore<SimpleArtist[]>(
		untrack(() => [...(props.initArtists ?? [])]),
	)

	const contain = (artist: SimpleArtist) =>
		artists.some((a) => a.id === artist.id)

	const dataFilter = createMemo(() => {
		const ids = new Set(artists.map((artist) => artist.id))
		return (artist: SimpleArtist) => !ids.has(artist.id)
	})

	const addArtist = (artist: SimpleArtist) => {
		if (contain(artist)) return
		insert(props.of, { path: ["data", "artists"], initialInput: artist.id })
		setArtists(artists.length, { id: artist.id, name: artist.name })
	}

	const removeArtistAt = (idx: number) => {
		remove(props.of, { path: ["data", "artists"], at: idx })
		setArtists((list) => list.toSpliced(idx, 1))
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Artists`}</label>
				<div {...stylex.attrs(styles.actions)}>
					<ArtistSearchDialog
						onSelect={addArtist}
						dataFilter={dataFilter()}
						icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
					/>
				</div>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "artists"] })}
			/>
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={artists}
					fallback={<FieldArrayFallback />}
				>
					{(artist, idx) => (
						<li {...stylex.attrs(styles.item)}>
							<ArtistInfo value={{ id: artist.id, name: artist.name }} />

							<Field
								of={props.of}
								path={["data", "artists", idx()]}
							>
								{(field) => (
									<>
										<input
											{...field.props}
											type="number"
											hidden
											value={field.input}
										/>
										<For each={field.errors}>
											{(error) => (
												<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
											)}
										</For>
									</>
								)}
							</Field>
							<Button
								onClick={() => removeArtistAt(idx())}
								appearance="ghost"
								tone="gray"
								size="sm"
							>
								<Cross1Icon />
							</Button>
						</li>
					)}
				</For>
			</ul>
		</div>
	)
}
