export type If<Cond extends boolean, T, F> = Cond extends true ? T : F
