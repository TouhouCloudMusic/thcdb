import { useField, useFieldArray, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LabelSearchDialog } from "~/component/form/SearchDialog"
import { formStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"

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
	addButton: { height: "max-content", padding: px[8] },
	icon: { width: px[16], height: px[16] },
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
		gridTemplateColumns: "repeat(2,minmax(0,1fr)) auto auto",
		alignItems: "center",
		gap: px[8],
	},
	placeholder: { color: colors.textTertiary },
	removeButton: { padding: px[8] },
})

function CatalogNumberRow(props: { of: ReleaseFormStore; index: number }) {
	const { t } = useLingui()

	const catalogNumber = useField(
		() => props.of,
		() => ({
			path: ["data", "catalog_nums", props.index, "catalog_number"],
		}),
	)

	const label = useField(
		() => props.of,
		() => ({
			path: ["data", "catalog_nums", props.index, "label"],
		}),
	)
	const removeCatalogNumber = () =>
		remove(props.of, {
			path: ["data", "catalog_nums"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.item)}>
			<InputField.Root>
				<InputField.Input
					{...catalogNumber.props}
					placeholder={t`Catalog No.`}
					value={catalogNumber.input}
				/>
				<InputField.Error>{catalogNumber.errors?.[0]}</InputField.Error>
			</InputField.Root>
			<Show
				when={label.input}
				fallback={
					<span
						{...stylex.attrs(rowStyles.placeholder)}
					>{t`No label selected`}</span>
				}
			>
				<span {...stylex.attrs(entityInfoStyles.name)}>
					{label.input?.name}
				</span>
			</Show>
			<LabelSearchDialog
				onSelect={label.onInput}
				icon={<Pencil1Icon />}
			/>
			<Button
				onClick={removeCatalogNumber}
				appearance="ghost"
				tone="gray"
				size="sm"
				styles={rowStyles.removeButton}
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

export function ReleaseCatalogNumbersField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const catalogNumbers = useFieldArray(() => props.of, {
		path: ["data", "catalog_nums"],
	})

	const addCatalogNumber = () => {
		insert(props.of, {
			path: catalogNumbers.path,
		})
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Catalog Numbers`}</label>
				<Button
					onClick={addCatalogNumber}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={catalogNumbers.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<CatalogNumberRow
							of={props.of}
							index={index()}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
