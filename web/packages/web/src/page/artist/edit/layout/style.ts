// @tw
export const label = "text-[1.1rem] font-semibold"

// @tw
export const input = "rounded-sm border-[0.1rem] border-gray-300 px-1 h-fit"

// @tw
const alias_layout = "flex place-content-between min-h-48"
// @tw
const alias_label = "flex flex-row place-content-between"
// @tw
const alias_list_container = "flex min-w-96 flex-col"
// @tw
const alias_list_title = "flex flex-row place-content-between"
export const alias = {
  layout: alias_layout,
  label: alias_label,
  list: {
    container: alias_list_container,
    title: alias_list_title,
  },
} as const

export { alias as member }

// @tw
const search_result_container = "h-72 overflow-auto"

// @tw
const search_result_list =
  "mt-2 gap-1 w-full h-fit flex flex-col rounded-sm bg-white px-2 py-1"

// @tw
const search_result = "w-full rounded-sm border border-gray-300 bg-white px-2 mt-1"

export const searchResult = {
  container: search_result_container,
  list: search_result_list,
  item: search_result,
}
