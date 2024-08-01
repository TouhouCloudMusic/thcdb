import { Field } from "@modular-forms/solid"
import { FormUI } from "~/component/form/ui"
import { useController } from "../../context"
import { h4Class } from "../style"

export function Name() {
	const { artistData, formStore, t } = useController()
	return (
		<Field
			of={formStore()}
			name="name">
			{(field, props) => (
				<div class="flex flex-col">
					<label
						for="name"
						class={h4Class}>
						{t("name.label")}
					</label>
					<input
						{...props}
						type="text"
						class={`h-7 w-2/3 rounded border border-gray-400 px-2 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-600`}
						classList={{
							"invalid:focus:ring-red-800 invalid:focus:border-red-800":
								field.error.length > 0,
						}}
						value={artistData() ? artistData()?.name : undefined}
						placeholder={t("name.placeholder")}
						required
					/>
					{field.error && <FormUI.ErrorText text={field.error} />}
				</div>
			)}
		</Field>
	)
}
