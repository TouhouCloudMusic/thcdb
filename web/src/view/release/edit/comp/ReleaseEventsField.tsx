// 事件字段（受控组件）
import { Field, insert, remove } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { SimpleEvent } from "@thc/api"
import { For } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { EventSearchDialog } from "~/component/form/SearchDialog"

import { EventInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

export function ReleaseEventsField(props: {
	of: ReleaseFormStore
	initEvents?: SimpleEvent[]
	class?: string
}) {
	const [events, setEvents] = createStore<SimpleEvent[]>([
		...(props.initEvents ?? []),
	])

	const addEvent = (e: SimpleEvent) => {
		if (events.some((x) => x.id === e.id)) return
		insert(props.of, { path: ["data", "events"], initialInput: e.id })
		setEvents(events.length, e)
	}

	const removeEventAt = (idx: number) => () => {
		remove(props.of, { path: ["data", "events"], at: idx })
		setEvents((list) => list.toSpliced(idx, 1))
	}
	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Events</Trans>
				</FormComp.Label>
				<div class="flex gap-2">
					<EventSearchDialog
						onSelect={addEvent}
						icon={<PlusIcon class="size-4 text-slate-600" />}
					/>
				</div>
			</div>
			<ul class="flex h-full flex-col gap-2">
				<For
					each={events}
					fallback={<FieldArrayFallback />}
				>
					{(ev, idx) => (
						<li class="grid h-fit grid-cols-[1fr_auto]">
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
								variant="Tertiary"
								size="Sm"
								onClick={removeEventAt(idx())}
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
