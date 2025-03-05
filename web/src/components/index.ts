export type ValidColor =
  | "slate"
  | "gray"
  | "reimu"
  | "marisa"
  | "green"
  | "blue"

export const ValidColor = {
  iter: function* () {
    yield "slate"
    yield "gray"
    yield "reimu"
    yield "marisa"
    yield "green"
    yield "blue"
  },
}
