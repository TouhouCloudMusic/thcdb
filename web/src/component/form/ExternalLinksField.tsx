import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { createMemo, untrack } from "solid-js"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
import { formStyles, dividerStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import type { ArrayField } from "./types"

const styles = stylex.create({
	root: { display: "flex", minHeight: px[128], flexDirection: "column" },
	header: {
		marginBottom: px[16],
		display: "flex",
		placeContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	label: { margin: 0 },
	add: { height: "max-content", padding: px[8] },
	icon: { width: px[16], height: px[16] },
	list: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
	},
})

const rowStyles = stylex.create({
	row: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) auto",
		columnGap: px[8],
	},
	error: { gridColumnStart: "1" },
	remove: { gridColumnStart: "2", gridRow: "1 / span 2", width: "fit-content" },
})

function ExternalLinkRow(props: { field: ArrayField<string>; index: number }) {
	const { t } = useLingui()

	const index = createMemo(() => props.index)
	const field = untrack(() => props.field.fieldAt(index))

	const removeLink = () => props.field.remove(props.index)

	return (
		<InputField.Root
			as="li"
			styles={rowStyles.row}
		>
			<InputField.Input
				{...field.props}
				id={field.path.join(".")}
				type="url"
				placeholder={t`URL`}
				value={field.input ?? ""}
			/>
			<InputField.Error styles={rowStyles.error}>
				{field.errors?.[0]}
			</InputField.Error>
			<Button
				onClick={removeLink}
				appearance="ghost"
				tone="gray"
				size="sm"
				styles={rowStyles.remove}
			>
				<Cross1Icon />
			</Button>
		</InputField.Root>
	)
}

export function ExternalLinksField(props: {
	field: ArrayField<string>
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	return (
		<div {...stylex.attrs(styles.root, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Links`}</label>
				<Button
					onClick={props.field.append}
					appearance="ghost"
					tone="gray"
					styles={styles.add}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>

			<ul {...stylex.attrs(styles.list)}>
				<Intersperse
					of={props.field.items}
					with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<ExternalLinkRow
							field={props.field}
							index={index()}
						/>
					)}
				</Intersperse>
			</ul>
		</div>
	)
}
