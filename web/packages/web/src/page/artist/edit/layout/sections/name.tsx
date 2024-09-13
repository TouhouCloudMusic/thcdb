import { Field } from "@modular-forms/solid"
import { FormUI } from "~/component/form/ui"
import { useController } from "../../context.tsx"
import * as Style from "../style.ts"

export function Name() {
	const { formStore, initData, t, dataQuery } = useController()

	return (
		<Field
			of={formStore}
			name="name">
			{(field, props) => (
				<div class="flex flex-col">
					<label
						for="name"
						class={Style.label}>
						{t.name()}
					</label>
					<input
						{...props}
						value={initData()?.name ?? (!dataQuery ? "" : "Loading...")}
						type="text"
						class={`h-7 w-2/3 rounded border border-gray-400 px-2 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-600`}
						classList={{
							"invalid:focus:ring-reimu-800 invalid:focus:border-reimu-800":
								field.error.length > 0,
						}}
						placeholder={t.enter_artist_name()}
						required
					/>
					{field.error && <FormUI.ErrorText text={field.error} />}
				</div>
			)}
		</Field>
	)
}
