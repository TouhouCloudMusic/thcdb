import * as K_Select from "@kobalte/core/select"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { CaretSortIcon } from "@thc/icons/radix"
import { Nil } from "@thc/toolkit/data"
import type { JSX } from "solid-js"
import { createContext, For, Show, splitProps, useContext } from "solid-js"
import * as v from "valibot"

import { textStyles } from "~/style"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import {
	radius,
	colors,
	fontSizes,
	lineHeights,
	px,
} from "~/style/tokens.stylex"

import { inputStyles } from "../../Input"
import { ErrorMessage } from "../error_message"

export const underlineSelectStyles = stylex.create({
	trigger: {
		height: "auto",
		minHeight: px[32],
		backgroundColor: {
			default: colors.backgroundPrimary,
			":disabled": palette.slate[100],
		},
		borderWidth: 0,
		borderBottomWidth: "1px",
		borderRadius: 0,
		borderColor: {
			default: palette.slate[400],
			':is([aria-invalid="true"])': palette.reimu[600],
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):hover)": palette.reimu[500],
			},
			":focus-visible": palette.reimu[600],
			":is([data-expanded])": palette.reimu[600],
		},
		paddingBlock: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 400,
		color: { default: colors.textSecondary, ":disabled": palette.slate[400] },
		transitionProperty: "border-color, color",
	},
	content: {
		minWidth: px[160],
		borderRadius: radius.xs,
		borderColor: palette.slate[200],
		boxShadow: "none",
		backgroundColor: colors.backgroundPrimary,
	},
	listbox: {
		outlineStyle: "none",
	},
	item: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr)",
		alignItems: "center",
		borderRadius: 0,
		minHeight: px[32],
		paddingInline: px[12],
		paddingBlock: px[4],
		fontWeight: 400,
		color: {
			default: colors.textSecondary,
			":is([data-selected])": colors.textPrimary,
		},
		backgroundColor: {
			default: "transparent",
			":is([data-highlighted])": palette.slate[100],
		},
		opacity: { default: null, ":is([data-disabled])": 0.5 },
	},
})

const selectStyles = stylex.create({
	column: { display: "flex", flexDirection: "column" },
	trigger: {
		display: "grid",
		gridTemplateColumns: `minmax(0, 1fr) ${px[32]}`,
		alignItems: "center",
		height: px[32],
		textAlign: "left",
		fontWeight: 300,
	},

	value: {
		paddingInlineStart: px[8],
	},

	icon: {
		display: "grid",
		placeItems: "center",
	},
	caret: { width: px[16], height: px[16], color: colors.textSecondary },

	content: {
		zIndex: 50,
		maxHeight: px[256],
		borderRadius: radius.sm,
		display: "flex",
		flexDirection: "column",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	},

	listbox: {
		minHeight: 0,
		overflowY: "auto",
		padding: px[4],
	},

	item: {
		cursor: "default",
		borderRadius: radius.xs,
		paddingInline: px[8],
		paddingBlock: px[6],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[900],
		userSelect: "none",
		backgroundColor: {
			default: null,
			":is([data-highlighted])": palette.slate[100],
		},
		outlineStyle: { default: null, ":is([data-highlighted])": "none" },
	},
})

type TextValue<Option> =
	| Extract<
			{
				[Key in keyof Option]: Option[Key] extends string ? Key : never
			}[keyof Option],
			string & keyof Option
	  >
	| ((option: Option) => string)

type FieldProps = Pick<
	JSX.ButtonHTMLAttributes<HTMLButtonElement>,
	"name" | "ref" | "onFocus" | "onBlur"
>
	& Pick<JSX.SelectHTMLAttributes<HTMLSelectElement>, "onChange">

type SelectContextValue = {
	fieldProps: FieldProps | undefined
	errors: readonly string[] | null | undefined
	valueText: () => JSX.Element
}

const SelectContext = createContext<SelectContextValue>()

function useSelect() {
	const context = useContext(SelectContext)

	if (!context) throw new Error("Select parts must be used within Select.Root")

	return context
}

type Props<Option extends string | object> = {
	options: readonly Option[]
	value: Option | undefined
	onChange: (value: Option | undefined) => void
	optionValue?: keyof Option | ((option: Option) => string | number)
	itemComponent?: K_Select.SelectRootProps<Option>["itemComponent"]
	children: JSX.Element
	placeholder?: JSX.Element
	errors?: readonly string[] | null
	disabled?: boolean
	name?: string
	required?: boolean
	readOnly?: boolean
	fieldProps?: FieldProps
	styles?: StyleXStyles
} & ([Option] extends [string]
	? { optionTextValue?: TextValue<Option> }
	: { optionTextValue: TextValue<Option> })

function SelectRoot<Option extends string | object>(props: Props<Option>) {
	const optionText = (option: Option) => {
		const textValue = props.optionTextValue

		const text =
			typeof textValue === "function"
				? textValue(option)
				: textValue === undefined
					? option
					: option[textValue]

		v.assert(v.string(), text)

		return text
	}

	return (
		<SelectContext.Provider
			value={{
				get fieldProps() {
					return props.fieldProps
				},
				get errors() {
					return props.errors
				},
				valueText: () => Nil.map(optionText, props.value),
			}}
		>
			<K_Select.Root<Option>
				name={props.fieldProps?.name ?? props.name}
				value={props.value ?? null}
				onChange={(value) => props.onChange(value ?? undefined)}
				options={[...props.options]}
				optionValue={props.optionValue}
				optionTextValue={props.optionTextValue}
				placeholder={props.placeholder}
				disabled={props.disabled}
				required={props.required}
				readOnly={props.readOnly}
				validationState={props.errors?.length ? "invalid" : "valid"}
				itemComponent={
					props.itemComponent
					?? ((itemProps) => (
						<SelectItem item={itemProps.item}>
							{optionText(itemProps.item.rawValue)}
						</SelectItem>
					))
				}
				{...stylex.attrs(selectStyles.column, props.styles)}
			>
				<Show when={props.fieldProps !== undefined || props.name !== undefined}>
					<K_Select.HiddenSelect onChange={props.fieldProps?.onChange} />
				</Show>
				{props.children}
			</K_Select.Root>
		</SelectContext.Provider>
	)
}

function SelectLabel(props: { children: JSX.Element; styles?: StyleXStyles }) {
	return (
		<K_Select.Label {...stylex.attrs(formStyles.label, props.styles)}>
			{props.children}
		</K_Select.Label>
	)
}

function SelectValue(props: { children?: JSX.Element; styles?: StyleXStyles }) {
	const context = useSelect()

	return (
		<K_Select.Value
			{...stylex.attrs(textStyles.ellipsis, selectStyles.value, props.styles)}
		>
			{() => props.children ?? context.valueText()}
		</K_Select.Value>
	)
}

function SelectIcon() {
	return (
		<K_Select.Icon {...stylex.attrs(selectStyles.icon)}>
			<CaretSortIcon {...stylex.attrs(selectStyles.caret)} />
		</K_Select.Icon>
	)
}

function SelectTrigger(
	props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
		styles?: StyleXStyles
	},
) {
	const context = useSelect()
	const [local, others] = splitProps(props, ["children", "styles"])

	return (
		<K_Select.Trigger
			{...{ ref: context.fieldProps?.ref }}
			onFocus={context.fieldProps?.onFocus}
			onBlur={context.fieldProps?.onBlur}
			aria-invalid={context.errors?.length ? true : undefined}
			{...others}
			{...stylex.attrs(inputStyles.like, selectStyles.trigger, local.styles)}
		>
			{local.children ?? (
				<>
					<SelectValue />
					<SelectIcon />
				</>
			)}
		</K_Select.Trigger>
	)
}

function SelectListbox(props: { styles?: StyleXStyles }) {
	return (
		<K_Select.Listbox {...stylex.attrs(selectStyles.listbox, props.styles)} />
	)
}

function SelectContent(props: {
	children?: JSX.Element
	styles?: StyleXStyles
}) {
	return (
		<K_Select.Portal>
			<K_Select.Content {...stylex.attrs(selectStyles.content, props.styles)}>
				{props.children ?? <SelectListbox />}
			</K_Select.Content>
		</K_Select.Portal>
	)
}

function SelectItem(
	props: K_Select.SelectItemProps & {
		styles?: StyleXStyles
		children: JSX.Element
	},
) {
	return (
		<K_Select.Item
			item={props.item}
			{...stylex.attrs(selectStyles.item, props.styles)}
		>
			{props.children}
		</K_Select.Item>
	)
}

function SelectErrorList() {
	const context = useSelect()

	return (
		<K_Select.ErrorMessage {...stylex.attrs(selectStyles.column)}>
			<For each={context.errors}>
				{(error) => <ErrorMessage>{error}</ErrorMessage>}
			</For>
		</K_Select.ErrorMessage>
	)
}

export const Select = {
	Root: SelectRoot,
	Label: SelectLabel,
	Trigger: SelectTrigger,
	Value: SelectValue,
	Icon: SelectIcon,
	Content: SelectContent,
	Listbox: SelectListbox,
	Item: SelectItem,
	ErrorList: SelectErrorList,
}
