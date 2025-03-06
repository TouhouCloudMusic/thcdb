export type AppColor = "Slate" | "Gray" | "Reimu" | "Marisa" | "Green" | "Blue"

export const AppColor = {
  *iter() {
    yield "Blue" as AppColor
    yield "Gray"
    yield "Green"
    yield "Marisa"
    yield "Reimu"
    yield "Slate"
  },
}
