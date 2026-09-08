import { Field, getErrors, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { SimpleArtist } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { Either, Option as O } from "effect"
import { For, createEffect, createSignal, on, untrack } from "solid-js"

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

type FounderEntry = {
	id: number
	name: string
}

type Props = {
	styles?: StyleXStyles
	initFounderIds?: number[]
}

export function LabelFoundersField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

	const [founders, setFounders] = createSignal<FounderEntry[]>(
		untrack(
			() => props.initFounderIds?.map((id) => ({ id, name: `#${id}` })) ?? [],
		),
	)

	const contain = (artist: SimpleArtist) =>
		founders().some((entry) => entry.id === artist.id)

	const addFounder = (artist: SimpleArtist) => {
		if (contain(artist)) return

		insert(formStore, {
			path: ["data", "founders"],
			initialInput: artist.id,
		})
		setFounders((prev) => [...prev, { id: artist.id, name: artist.name }])
	}

	const removeFounderAt = (index: number) => () => {
		remove(formStore, { path: ["data", "founders"], at: index })
		setFounders((prev) => prev.toSpliced(index, 1))
	}

	createEffect(
		on(
			() => props.initFounderIds,
			(ids) => {
				if (!ids || ids.length === 0) {
					setFounders([])
					return
				}

				setFounders(ids.map((id) => ({ id, name: `#${id}` })))

				const fetchFounders = async () => {
					const results = await Promise.all(
						ids.map(async (id) => {
							const result = await ArtistApi.findOne({ path: { id } })
							return Either.match(result, {
								onRight: (option) => O.getOrNull(option),
								onLeft: (err) => {
									console.error(err)
								},
							})
						}),
					)

					setFounders((prev) =>
						prev.map((entry, index) => {
							const artist = results[index]
							if (artist) {
								return { id: artist.id, name: artist.name }
							}
							return entry
						}),
					)
				}
				void fetchFounders()
			},
			{ defer: true },
		),
	)

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Founders`}</label>
				<ArtistSearchDialog
					onSelect={addFounder}
					icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
					dataFilter={(artist) => !contain(artist)}
				/>
			</div>
			<FormComp.ErrorList
				errors={getErrors(formStore, { path: ["data", "founders"] })}
			/>
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={founders()}
					fallback={<FieldArrayFallback />}
				>
					{(founder, idx) => (
						<li {...stylex.attrs(styles.founder)}>
							<div {...stylex.attrs(styles.founderDetails)}>
								<span {...stylex.attrs(styles.founderName)}>
									{founder.name}
								</span>
								<span {...stylex.attrs(styles.founderId)}>#{founder.id}</span>
							</div>
							<Field
								of={formStore}
								path={["data", "founders", idx()]}
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
								onClick={removeFounderAt(idx())}
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
