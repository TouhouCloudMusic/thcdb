import {
	TextField as _TextField,
	type FormControlErrorMessageProps,
	type PolymorphicProps,
} from "@kobalte/core"
import {
	type TextFieldInputProps,
	type TextFieldLabelProps,
	type TextFieldRootProps,
} from "@kobalte/core/text-field"
import { mergeProps, type ValidComponent } from "solid-js"
import { twMerge } from "tailwind-merge"
import { ErrorMessage, Input, Label } from "./base.tsx"
import { SmartSelectorCanAutoAddAsteriskAfterLabelOfRequiredField } from "./class_names.ts"

function TextField<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, TextFieldRootProps<T>>
) {
	const finalProps = mergeProps(props, {
		get class() {
			return props["class"] ?
					twMerge(TextField.className, props["class"])
				:	TextField.className
		},
	})

	return <_TextField.Root {...finalProps} />
}

TextField.className = `flex flex-col ${SmartSelectorCanAutoAddAsteriskAfterLabelOfRequiredField}`

function TextFieldLabel<T extends ValidComponent = "label">(
	props: PolymorphicProps<T, TextFieldLabelProps<T>>
) {
	const finalProps = mergeProps(props, {
		get class() {
			return props["class"] ?
					twMerge(TextFieldLabel.className, props["class"])
				:	TextFieldLabel.className
		},
	})

	return (
		<_TextField.Label
			data-slot="label"
			{...finalProps}
		/>
	)
}

TextFieldLabel.className = Label.className
TextField.Label = TextFieldLabel

function TextFieldInput<T extends ValidComponent = "input">(
	props: PolymorphicProps<T, TextFieldInputProps<T>>
) {
	const finalProps = mergeProps(props, {
		get class() {
			return props["class"] ?
					twMerge(TextFieldInput.className, props["class"])
				:	TextFieldInput.className
		},
	})
	return (
		<_TextField.Input
			data-slot="input"
			{...finalProps}
		/>
	)
}

// @tw
TextFieldInput.className = Input.className
TextField.Input = TextFieldInput
TextField.InputContainer = {
	className:
		// @tw
		"ring-1 rounded-md ring-inset ring-slate-300 focus-within:ring-inset focus-within:ring-reimu-700 aria-invalid:ring-2 aria-invalid:ring-reimu-700 has-[[aria-invalid]]:ring-2 has-[[aria-invalid]]:ring-reimu-700",
}

function TextFieldErrorMessage<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, FormControlErrorMessageProps<T>>
) {
	const finalProps = mergeProps(props, {
		get class() {
			return props["class"] ?
					twMerge(TextFieldErrorMessage.className, props["class"])
				:	TextFieldErrorMessage.className
		},
	})
	return <_TextField.ErrorMessage {...finalProps} />
}
TextFieldErrorMessage.className = ErrorMessage.className
TextField.ErrorMessage = TextFieldErrorMessage

export { TextField }
