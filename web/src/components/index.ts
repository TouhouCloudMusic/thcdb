export type AppColor =
  | "Reimu" //
  | "Marisa"
  | "Green"
  | "Blue"
  | "Gray"
  | "Slate"

export const AppColor = {
  *iter() {
    yield "Reimu" as AppColor
    yield "Marisa"
    yield "Green"
    yield "Blue"
    yield "Gray"
    yield "Slate"
  },
}
