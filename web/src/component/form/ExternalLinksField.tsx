import type { FormStore } from "@formisch/solid"
import { insert, remove, useField, useFieldArray } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import type { GenericSchema } from "valibot"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
import { formStyles, dividerStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

const styles = stylex.create({
	row: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) auto",
		columnGap: px[8],
	},
	error: { gridColumnStart: "1" },
	remove: { gridColumnStart: "2", gridRow: "1 / span 2", width: "fit-content" },
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
type ExternalLinksFormStore = FormStore<
	GenericSchema<{ data: { links?: string[] | null } }, unknown>
>

function ExternalLinkRow(props: { of: ExternalLinksFormStore; index: number }) {
	const { t } = useLingui()
	const field = useField(
		() => props.of,
		() => ({ path: ["data", "links", props.index] }),
	)

	return (
		<InputField.Root
			as="li"
			styles={styles.row}
		>
			<InputField.Input
				{...field.props}
				id={field.path.join(".")}
				type="url"
				placeholder={t`URL`}
				value={field.input ?? ""}
			/>
			<InputField.Error styles={styles.error}>
				{field.errors?.[0]}
			</InputField.Error>
			<Button
				onClick={() =>
					remove(props.of, { path: ["data", "links"], at: props.index })
				}
				appearance="ghost"
				tone="gray"
				size="sm"
				styles={styles.remove}
			>
				<Cross1Icon />
			</Button>
		</InputField.Root>
	)
}

export function ExternalLinksField(props: {
	of: ExternalLinksFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const links = useFieldArray(() => props.of, { path: ["data", "links"] })

	return (
		<div {...stylex.attrs(styles.root, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Links`}</label>
				<Button
					onClick={() =>
						insert(props.of, { path: ["data", "links"], initialInput: "" })
					}
					appearance="ghost"
					tone="gray"
					styles={styles.add}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>

			<ul {...stylex.attrs(styles.list)}>
				<Intersperse
					of={links.items}
					with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<ExternalLinkRow
							of={props.of}
							index={index()}
						/>
					)}
				</Intersperse>
			</ul>
		</div>
	)
}
