import { createMemo, JSX } from "solid-js"
import { twMerge } from "tailwind-merge"
import { Label } from "./base.tsx"

const RadioGroupLabel = (props: JSX.LabelHTMLAttributes<HTMLLabelElement>) => {
	const className = createMemo(() =>
		props.class ?
			twMerge(RadioGroupLabel.className, props.class)
		:	RadioGroupLabel.className
	)

	return (
		// eslint-disable-next-line jsx-a11y/label-has-associated-control
		<label
			{...props}
			class={className()}></label>
	)
}

RadioGroupLabel.className = "block text-sm font-medium leading-6"

export const RadioGroup = {
	className: "",
	Label: {
		className: Label.className,
	},
	Container: {
		className: "mt-6",
	},
	Item: {
		className: "flex items-center gap-x-3 mt-6",
		Input: {
			// @tw
			className: "size-4 border-slate-400 text-reimu-700 focus:ring-reimu-700",
		},
	},
	ItemLabel: RadioGroupLabel,
}
