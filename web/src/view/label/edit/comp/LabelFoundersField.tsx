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
import type { Artist } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { useLabelForm } from "../context"

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
	icon: { width: px[16], height: px[16] },
	list: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
	},
})

const rowStyles = stylex.create({
	founder: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "center",
		gap: px[8],
	},
	founderDetails: { display: "flex", flexDirection: "column" },
	founderName: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
	},
	founderId: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
})

type Props = {
	styles?: StyleXStyles
}

function FounderRow(props: { index: number }) {
	const { formStore } = useLabelForm()

	const field = useField(formStore, () => ({
		path: ["data", "founders", props.index],
	}))

	const removeFounder = () =>
		remove(formStore, {
			path: ["data", "founders"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.founder)}>
			<div {...stylex.attrs(rowStyles.founderDetails)}>
				<span {...stylex.attrs(rowStyles.founderName)}>
					{field.input?.name}
				</span>
				<span {...stylex.attrs(rowStyles.founderId)}>#{field.input?.id}</span>
			</div>
			<For each={field.errors}>
				{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
			</For>
			<Button
				onClick={removeFounder}
				appearance="ghost"
				tone="gray"
				size="sm"
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

export function LabelFoundersField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

	const founderArray = useFieldArray(formStore, {
		path: ["data", "founders"],
	})

	const isAvailableArtist = (artist: Artist) =>
		!getInput(formStore, { path: founderArray.path }).some(
			(founder) => founder.id === artist.id,
		)

	const addFounder = (artist: Artist) => {
		if (!isAvailableArtist(artist)) return

		insert(formStore, { path: founderArray.path, initialInput: artist })
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Founders`}</label>
				<ArtistSearchDialog
					onSelect={addFounder}
					icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
					filter={isAvailableArtist}
				/>
			</div>
			<FormComp.ErrorList errors={founderArray.errors} />
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={founderArray.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => <FounderRow index={index()} />}
				</For>
			</ul>
		</div>
	)
}
