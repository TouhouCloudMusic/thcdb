// 事件字段（受控组件）
import { Field, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { SimpleEvent } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { FieldArrayFallback } from "~/component/form"
import { EventSearchDialog } from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { EventInfo } from "./EntityInfo"
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

export function ReleaseEventsField(props: {
	of: ReleaseFormStore
	initEvents?: SimpleEvent[]
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const [events, setEvents] = createStore<SimpleEvent[]>(
		untrack(() => [...(props.initEvents ?? [])]),
	)

	const addEvent = (e: SimpleEvent) => {
		if (untrack(() => events.some((x) => x.id === e.id))) return
		insert(props.of, { path: ["data", "events"], initialInput: e.id })
		setEvents(events.length, e)
	}

	const removeEventAt = (idx: number) => {
		remove(props.of, { path: ["data", "events"], at: idx })
		setEvents((list) => list.toSpliced(idx, 1))
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
					each={events}
					fallback={<FieldArrayFallback />}
				>
					{(ev, idx) => (
						<li {...stylex.attrs(styles.item)}>
							<EventInfo value={{ id: ev.id, name: ev.name }} />

							<Field
								of={props.of}
								path={["data", "events", idx()]}
							>
								{(field) => (
									<input
										{...field.props}
										type="number"
										hidden
										value={field.input}
									/>
								)}
							</Field>
							<Button
								onClick={() => removeEventAt(idx())}
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
