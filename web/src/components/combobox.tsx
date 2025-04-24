const Item = {
  className: [
    "inline-flex place-content-between rounded-sm px-1 py-0.5 data-highlighted:bg-gray-100 text-gray-900",
    // @tw
    "data-selected:bg-reimu-700 data-selected:text-white data-selected:font-medium ",
  ].join(" "),
}

const Control = {
  // @tw
  className:
    "flex ring-1 rounded-md ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-reimu-700 h-fit",
}

export const Combobox = {
  Item,
  Control,
}
