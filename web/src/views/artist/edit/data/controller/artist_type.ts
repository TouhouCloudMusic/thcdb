import {
  type FormStore,
  getValue,
  getValues,
  setValues,
} from "@modular-forms/solid"
import { createEffect, on } from "solid-js"
import { produce, type SetStoreFunction } from "solid-js/store"

import { type ControllerStore } from "."
import { type ArtistFormSchema, type MemberListSchema } from "../form"

export class ArtistTypeController {
  constructor(
    private store: ControllerStore,
    private setStore: SetStoreFunction<ControllerStore>,
    private formStore: FormStore<ArtistFormSchema>,
  ) {
    createEffect(
      on(
        () => getValue(formStore, "artist_type"),
        (type) => {
          if (!type) return

          const currentList = getValues(formStore, "member") as MemberListSchema
          setValues(formStore, "member", this.store.member.cache ?? [])
          this.setStore(
            produce((store) => {
              store.alias.searchResult = undefined
              store.member.cache = currentList
              store.member.searchResult = undefined
            }),
          )
        },
      ),
    )
  }

  get isPerson() {
    return getValue(this.formStore, "artist_type") === "Person"
  }

  get isGroup() {
    return getValue(this.formStore, "artist_type") === "Group"
  }

  get isNone() {
    return getValue(this.formStore, "artist_type") === undefined
  }
}
