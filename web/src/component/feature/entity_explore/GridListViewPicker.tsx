import { useLingui } from "@lingui/solid/macro"
import { ActivityLogIcon, DashboardIcon } from "@thc/icons/radix"
import { twJoin } from "tailwind-merge"

export type ViewMode = "grid" | "list"

type GridListViewPickerProps = {
	value: ViewMode
	onChange: (value: ViewMode) => void
}

export function GridListViewPicker(props: GridListViewPickerProps) {
	const { t } = useLingui()
	const buttonClass = (value: ViewMode) => {
		const selectedClass =
			props.value === value
				? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
				: "text-slate-500 hover:bg-white/60 hover:text-slate-700"

		return twJoin(
			"grid h-full place-items-center transition-colors",
			selectedClass,
		)
	}

	return (
		<fieldset
			class="inline-grid h-10 grid-cols-[repeat(2,2.5rem)] items-center overflow-hidden rounded border border-slate-300 bg-slate-50"
			aria-label={t`View`}
		>
			<button
				type="button"
				class={buttonClass("grid")}
				aria-label={t`Grid view`}
				aria-pressed={props.value === "grid"}
				title={t`Grid view`}
				onClick={() => props.onChange("grid")}
			>
				<DashboardIcon />
			</button>
			<button
				type="button"
				class={buttonClass("list")}
				aria-label={t`List view`}
				aria-pressed={props.value === "list"}
				title={t`List view`}
				onClick={() => props.onChange("list")}
			>
				<ActivityLogIcon />
			</button>
		</fieldset>
	)
}
