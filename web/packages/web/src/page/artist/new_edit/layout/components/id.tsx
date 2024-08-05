import { Field } from "@modular-forms/solid"
import { useController } from "../../context"

export function ID() {
	const { formStore } = useController()
	return (
		<Field
			of={formStore()}
			name="id">
			{(field, props) => (
				<>
					<input
						{...props}
						type="text"
						value={field.value}
						hidden
					/>
					{field.error && <p>{field.error}</p>}
				</>
			)}
		</Field>
	)
}
