import type { PolymorphicProps } from "@kobalte/core"
import { TextField as K_TextField } from "@kobalte/core"
import type {
	TextFieldTextAreaProps,
	TextFieldInputProps,
	TextFieldRootProps,
} from "@kobalte/core/text-field"
import type { ValidComponent } from "solid-js"
import { createContext, createEffect, mergeProps } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { twMerge } from "tailwind-merge"

import type { SafeOmit } from "~/types"
import { assertContext } from "~/utils/solid/assertContext"

import { FormComp } from ".."
import { INPUT_BASE_CLASSNAME, INPUT_CLASSNAME } from "../../Input"
import { LABEL_CLASSNAME } from "../label"

const TEXT_INPUT_CLASS = `flex flex-col`

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

type RootProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	TextFieldRootProps<T>
>

export function Root<T extends ValidComponent = "div">(props: RootProps<T>) {
	const localProps = mergeProps(props, {
		get class() {
			return props["class"]
				? twMerge(TEXT_INPUT_CLASS, props["class"])
				: TEXT_INPUT_CLASS
		},
	})

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
			<K_TextField.Root
				validationState={contextStore.valid ? "valid" : "invalid"}
				{...localProps}
			/>
		</Context.Provider>
	)
}

export function Input(
	props: PolymorphicProps<"input", TextFieldInputProps<"input">>,
) {
	const context = assertContext(Context)

	createEffect(() => {
		if (props.id) {
			context.setInputId(props.id)
		}
	})

	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(INPUT_CLASSNAME, props.class)
		},
	})

	return <K_TextField.Input {...finalProps} />
}

export const TEXT_AREA_CLASSNAME = twMerge(
	INPUT_BASE_CLASSNAME,
	`
	min-h-32 p-2
	`,
)

export function Textarea(
	props: PolymorphicProps<"textarea", TextFieldTextAreaProps<"textarea">>,
) {
	const context = assertContext(Context)

	createEffect(() => {
		if (props.id) {
			context.setInputId(props.id)
		}
	})

	const finalProps = mergeProps(props, {
		get class() {
			return props.class
				? twMerge(TEXT_AREA_CLASSNAME, props.class)
				: TEXT_AREA_CLASSNAME
		},
	})

	return <K_TextField.TextArea {...finalProps} />
}

type LabelProps = SafeOmit<
	PolymorphicProps<"label", K_TextField.TextFieldLabelProps<"label">>,
	"for"
>
export function Label(props: LabelProps) {
	const context = assertContext(Context)

	const localProps = mergeProps(props, {
		get class() {
			return props.class
				? twMerge(LABEL_CLASSNAME, props.class)
				: LABEL_CLASSNAME
		},
		get for() {
			return context.inputId
		},
	})

	return <K_TextField.Label {...localProps} />
}

export function Error(props: FormComp.ErrorMessageProps) {
	const context = assertContext(Context)

	createEffect(() => {
		context.setValid(!props.children)
	})

	return <FormComp.ErrorMessage {...props} />
}
