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
import type { SimpleEvent } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FieldArrayFallback } from "~/component/form"
import { EventSearchDialog } from "~/component/form/SearchDialog"
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

function EventRow(props: { of: ReleaseFormStore; index: number }) {
	const field = useField(
		() => props.of,
		() => ({
			path: ["data", "events", props.index],
		}),
	)

	const removeEvent = () =>
		remove(props.of, { path: ["data", "events"], at: props.index })

	return (
		<li {...stylex.attrs(rowStyles.item)}>
			<span {...stylex.attrs(entityInfoStyles.name)}>{field.input?.name}</span>
			<Button
				onClick={removeEvent}
				appearance="ghost"
				tone="gray"
				size="sm"
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

export function ReleaseEventsField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const events = useFieldArray(() => props.of, { path: ["data", "events"] })

	const addEvent = (value: SimpleEvent) => {
		if (
			getInput(props.of, { path: events.path }).some(
				(reference) => reference.id === value.id,
			)
		) {
			return
		}

		insert(props.of, { path: events.path, initialInput: value })
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Events`}</label>
				<div {...stylex.attrs(styles.actions)}>
					<EventSearchDialog
						onSelect={addEvent}
						icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
					/>
				</div>
			</div>
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={events.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<EventRow
							of={props.of}
							index={index()}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
