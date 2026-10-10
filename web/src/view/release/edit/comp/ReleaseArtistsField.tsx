import {
	useFieldArray,
	getInput,
	useField,
	insert,
	remove,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { SimpleArtist } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For, createMemo } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { entityInfoStyles } from "./entityInfo.stylex"
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
})

const rowStyles = stylex.create({
	item: {
		display: "grid",
		height: "fit-content",
		gridTemplateColumns: "1fr auto",
	},
})

function ArtistRow(props: { of: ReleaseFormStore; index: number }) {
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
		<li {...stylex.attrs(rowStyles.item)}>
			<span {...stylex.attrs(entityInfoStyles.name)}>{field.input?.name}</span>
			<For each={field.errors}>
				{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
			</For>
			<Button
				onClick={removeArtist}
				appearance="ghost"
				tone="gray"
				size="sm"
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

export function ReleaseArtistsField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const artists = useFieldArray(() => props.of, { path: ["data", "artists"] })

	const selected = createMemo(() => getInput(props.of, { path: artists.path }))

	const isAvailableArtist = (value: SimpleArtist) =>
		!selected().some((reference) => reference.id === value.id)

	const addArtist = (value: SimpleArtist) => {
		if (!isAvailableArtist(value)) return

		insert(props.of, { path: artists.path, initialInput: value })
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
						filter={isAvailableArtist}
						icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
					/>
				</div>
			</div>
			<FormComp.ErrorList errors={artists.errors} />
			<ul {...stylex.attrs(styles.list)}>
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
