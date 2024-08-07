const label_tw = "text-[1.1rem] font-semibold"
export { label_tw as label }

const alias_layout_tw = "flex place-content-between"
const alias_label_tw = "flex flex-row place-content-between"
const alias_list_container_tw = "flex min-w-96 flex-col"
const alias_list_title_tw = "flex flex-row place-content-between"
export const alias = {
	layout: alias_layout_tw,
	label: alias_label_tw,
	list: {
		container: alias_list_container_tw,
		title: alias_list_title_tw,
	},
} as const

export { alias as member }
