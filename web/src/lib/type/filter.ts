export type FilterRecord<T> = Partial<Record<keyof T, boolean>>

export type Filter<TData, TFilter extends Record<PropertyKey, boolean>> = Pick<
  TData,
  {
    [K in keyof TData]: K extends keyof TFilter ?
      TFilter[K] extends true ?
        K
      : never
    : never
  }[keyof TData]
>
