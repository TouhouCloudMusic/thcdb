import type * as v from "valibot"

export type SatisfyValibotSchema<I, O = I> = {
  [K in keyof I]-?: K extends keyof O ? v.GenericSchema<I[K], O[K]> : never
}
