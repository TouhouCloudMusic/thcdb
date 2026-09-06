import type { FormStore } from "@formisch/solid"
import { insert, remove, useField, useFieldArray } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { twMerge } from "tailwind-merge"
import type { GenericSchema } from "valibot"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"

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
			class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2"
		>
			<InputField.Input
				{...field.props}
				id={field.path.join(".")}
				type="url"
				placeholder={t`URL`}
				value={field.input ?? ""}
			/>
			<InputField.Error class="col-start-1">
				{field.errors?.[0]}
			</InputField.Error>
			<Button
				variant="Tertiary"
				size="Sm"
				class="col-start-2 row-span-2 row-start-1 w-fit"
				onClick={() =>
					remove(props.of, { path: ["data", "links"], at: props.index })
				}
			>
				<Cross1Icon />
			</Button>
		</InputField.Root>
	)
}

export function ExternalLinksField(props: {
	of: ExternalLinksFormStore
	class?: string
}) {
	const { t } = useLingui()
	const links = useFieldArray(() => props.of, { path: ["data", "links"] })

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">{t`Links`}</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={() =>
						insert(props.of, { path: ["data", "links"], initialInput: "" })
					}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>

			<ul class="flex h-full flex-col gap-2">
				<Intersperse
					of={links.items}
					with={<Divider horizontal />}
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
