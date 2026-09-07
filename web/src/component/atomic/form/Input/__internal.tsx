import type { PolymorphicProps } from "@kobalte/core"
import { TextField as K_TextField } from "@kobalte/core"
import type {
	TextFieldTextAreaProps,
	TextFieldInputProps,
	TextFieldRootProps,
} from "@kobalte/core/text-field"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { createContext, createEffect, mergeProps, splitProps } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"
import type { SafeOmit } from "~/type"
import { assertContext } from "~/utils/solid/assertContext"

import { FormComp } from ".."
import { inputStyles } from "../../Input"

const styles = stylex.create({
	root: { display: "flex", flexDirection: "column" },
	textarea: { minHeight: px[128], padding: px[8] },
})
export const textareaStyles = [inputStyles.like, styles.textarea]

interface ContextStore {
	inputId?: string
	valid: boolean
}

type Context = {
	required?: boolean
	setInputId(str: string): void
	setValid(bool: boolean): void
} & ContextStore

const Context = createContext<Context>()

type RootProps = PolymorphicProps<
	"div" | "li",
	TextFieldRootProps<"div" | "li">
> & { styles?: StyleXStyles }

export function Root(props: RootProps) {
	const [local, others] = splitProps(props, ["styles"])

	const [contextStore, setContextStore] = createStore<ContextStore>({
		valid: true,
	})

	const contextValue = {
		get required() {
			return props.required
		},
		get inputId() {
			return contextStore.inputId
		},
		get valid() {
			return contextStore.valid
		},
		setInputId(str: string) {
			setContextStore(
				produce((v) => {
					v.inputId = str
				}),
			)
		},
		setValid(bool: boolean) {
			setContextStore(
				produce((v) => {
					v.valid = bool
				}),
			)
		},
	}

	return (
		<Context.Provider value={contextValue}>
			<K_TextField.Root<"div" | "li">
				validationState={contextStore.valid ? "valid" : "invalid"}
				{...others}
				{...stylex.attrs(styles.root, local.styles)}
			/>
		</Context.Provider>
	)
}

export function Input(
	props: PolymorphicProps<"input", TextFieldInputProps<"input">> & {
		styles?: StyleXStyles
	},
) {
	const context = assertContext(Context)

	createEffect(() => {
		if (props.id) {
			context.setInputId(props.id)
		}
	})

	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_TextField.Input
			{...others}
			{...stylex.attrs(inputStyles.like, inputStyles.input, local.styles)}
		/>
	)
}

export function Textarea(
	props: PolymorphicProps<"textarea", TextFieldTextAreaProps<"textarea">> & {
		styles?: StyleXStyles
	},
) {
	const context = assertContext(Context)

	createEffect(() => {
		if (props.id) {
			context.setInputId(props.id)
		}
	})

	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_TextField.TextArea
			{...others}
			{...stylex.attrs(textareaStyles, local.styles)}
		/>
	)
}

type LabelProps = SafeOmit<
	PolymorphicProps<"label", K_TextField.TextFieldLabelProps<"label">>,
	"for"
> & { styles?: StyleXStyles }
export function Label(props: LabelProps) {
	const context = assertContext(Context)

	const [local, others] = splitProps(props, ["styles"])
	const localProps = mergeProps(others, {
		get for() {
			return context.inputId
		},
	})

	return (
		<K_TextField.Label
			{...localProps}
			{...stylex.attrs(formStyles.label, local.styles)}
		/>
	)
}

export function Error(props: FormComp.ErrorMessageProps<"span">) {
	const context = assertContext(Context)

	createEffect(() => {
		context.setValid(!props.children)
	})

	return <FormComp.ErrorMessage {...props} />
}
