import { createMemo, type JSX, Show } from "solid-js"
import { twMerge } from "tailwind-merge"

export const Label = {
	// @tw
	className: `font-inter font-medium leading-6`,
}

export const Legend = {
	className: "font-inter text-base font-semibold leading-7 text-gray-900",
}

export const ErrorMessage = (
	props: Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> & {
		children?: string | undefined
	}
) => {
	const className = createMemo(() =>
		props.class ?
			twMerge(ErrorMessage.className, props.class)
		:	ErrorMessage.className
	)

	return (
		<Show when={props.children?.length}>
			<span
				{...props}
				class={className()}></span>
		</Show>
	)
}
ErrorMessage.className = "text-reimu-700 text-sm mt-2"

export const Input = {
	// @tw
	className:
		"py-1.5 pl-3 block border-0 bg-transparent rounded-md text-gray-900 placeholder:text-fg-tertiary sm:text-sm sm:leading-6",
}

export const InputContainer = {
	className:
		"ring-1 rounded-md ring-inset focus-within:ring-inset focus-within:ring-reimu-700 aria-invalid:ring-2 aria-invalid:ring-reimu-700 has-[[aria-invalid]]:ring-2 has-[[aria-invalid]]:ring-reimu-700",
}
