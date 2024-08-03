import {
	createFormStore,
	Field,
	Form,
	getValues,
	valiForm,
} from "@modular-forms/solid"
import * as v from "valibot"

const schema = v.object({
	numberInputWithDefaultNaN: v.number(),
	numberInputWithDefaultNull: v.number(),
	numberInputWithDefaultUndefined: v.number(),
	numberInputWithoutDefault: v.number(),
	numberInputWithoutField: v.number(),
	numberInputWithTypeText: v.number(),

	stringInputWithDefaultNull: v.string(),
	stringInputWithDefaultUndefined: v.string(),
	stringInputWithoutDefault: v.string(),
	stringInputWithoutField: v.string(),
	stringInputWithTypeNumber: v.string(),

	booleanInputWithDefaultTrue: v.boolean(),
	booleanInputWithDefaultFalse: v.boolean(),
	booleanInputWithoutDefault: v.boolean(),
	booleanInputWithoutField: v.boolean(),
	booleanInputWithTypeNumber: v.boolean(),
	booleanInputWithTypeText: v.boolean(),
})

export default function Test() {
	const formStore = createFormStore<v.InferInput<typeof schema>>({
		validate: valiForm(schema),
	})
	function Number() {
		return (
			<div class="flex flex-col gap-2">
				<Field
					of={formStore}
					name={"numberInputWithDefaultNaN"}
					type="number">
					{(filed, props) => (
						<input
							type="number"
							placeholder={filed.name}
							{...props}
							value={NaN}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"numberInputWithDefaultNull"}
					type="number">
					{(filed, props) => (
						<input
							type="number"
							placeholder={filed.name}
							{...props}
							value={null}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"numberInputWithDefaultUndefined"}
					type="number">
					{(filed, props) => (
						<input
							type="number"
							placeholder={filed.name}
							{...props}
							value={undefined}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"numberInputWithoutDefault"}
					type="number">
					{(filed, props) => (
						<input
							type="text"
							placeholder={filed.name}
							{...props}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"numberInputWithTypeText"}
					type="number">
					{(filed, props) => (
						<input
							type="text"
							placeholder={filed.name}
							{...props}
						/>
					)}
				</Field>
			</div>
		)
	}
	function String() {
		return (
			<div class="flex flex-col gap-2">
				<Field
					of={formStore}
					name={"stringInputWithDefaultNull"}
					type="string">
					{(filed, props) => (
						<input
							type="text"
							placeholder={filed.name}
							{...props}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"stringInputWithDefaultUndefined"}
					type="string">
					{(filed, props) => (
						<input
							type="text"
							placeholder={filed.name}
							{...props}
							value={undefined}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"stringInputWithoutDefault"}
					type="string">
					{(filed, props) => (
						<input
							type="text"
							placeholder={filed.name}
							{...props}
							value={undefined}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"stringInputWithTypeNumber"}
					type="string">
					{(filed, props) => (
						<input
							type="number"
							placeholder={filed.name}
							{...props}
						/>
					)}
				</Field>
			</div>
		)
	}
	function Bool() {
		return (
			<div class="flex flex-col gap-2">
				<Field
					of={formStore}
					name={"booleanInputWithDefaultFalse"}
					type="boolean">
					{(filed, props) => (
						<input
							{...props}
							type="checkbox"
							placeholder={filed.name}
							checked={false}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"booleanInputWithDefaultTrue"}
					type="boolean">
					{(filed, props) => (
						<input
							{...props}
							type="checkbox"
							placeholder={filed.name}
							checked={true}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"booleanInputWithTypeNumber"}
					type="boolean">
					{(filed, props) => (
						<input
							{...props}
							type="number"
							placeholder={filed.name}
							value={1}
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"booleanInputWithTypeText"}
					type="boolean">
					{(filed, props) => (
						<input
							{...props}
							type="text"
							placeholder={filed.name}
							value="true"
						/>
					)}
				</Field>
				<Field
					of={formStore}
					name={"booleanInputWithoutDefault"}
					type="boolean">
					{(filed, props) => (
						<input
							{...props}
							type="checkbox"
							placeholder={filed.name}
						/>
					)}
				</Field>
			</div>
		)
	}
	return (
		<>
			<Form
				of={formStore}
				onSubmit={(v) => console.log(v)}>
				<Number />
				<String />
				<Bool />
				<button type="submit">Submit</button>
			</Form>
			<button
				onClick={() => {
					const formValues = getValues(formStore)
					console.log(formValues)
				}}>
				Log
			</button>
		</>
	)
}
