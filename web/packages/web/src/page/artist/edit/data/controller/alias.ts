import {
  getValue,
  getValues,
  insert,
  remove,
  type FormStore,
} from "@modular-forms/solid"
import { type SetStoreFunction } from "solid-js/store"

import { isEmptyArray } from "~/lib/validate/array"
import { type ControllerStore } from "."
import { findArtistByKeyword, type ArtistByKeyword } from "../db"
import { type ArtistFormSchema } from "../form"

export class AliasController {
  constructor(
    private store: ControllerStore,
    private setStore: SetStoreFunction<ControllerStore>,
    private formStore: FormStore<ArtistFormSchema>,
  ) {}

  get searchResult() {
    return this.store.alias.searchResult
  }

  add(newArtist: ArtistByKeyword) {
    const aliases = getValues(this.formStore, "alias")
    if (aliases.find((a) => a?.id === newArtist.id)) return
    if (newArtist.artist_type !== getValue(this.formStore, "artist_type")) {
      return
    }
    insert(this.formStore, "alias", {
      value: {
        id: newArtist.id,
        name: newArtist.name,
        is_str: false,
      },
    })
  }

  addStrInput() {
    insert(this.formStore, "alias", {
      value: {
        is_str: true,
        name: "",
      },
    })
  }

  remove(index: number) {
    remove(this.formStore, "alias", {
      at: index,
    })
  }

  async serach(keyword: string) {
    if (keyword.length === 0) {
      this.setStore("alias", "searchResult", undefined)
    }

    // search is disabled when artist type is undefined
    const artistType = getValue(this.formStore, "artist_type")!

    const existArtists = getValues(this.formStore, "alias")
      .map((m) => m?.id)
      .filter((id) => id !== "") as string[]

    let currentArtistID = getValue(this.formStore, "id", {
      shouldActive: false,
    })

    if (currentArtistID && currentArtistID.length > 0) {
      existArtists.push(currentArtistID)
    }

    const result = await findArtistByKeyword(keyword, artistType, existArtists)

    if (isEmptyArray(result)) {
      this.setStore("member", "searchResult", undefined)
      return
    }
    const searchResult = result.map(
      (a) =>
        ({
          id: a.id,
          app_id: a.app_id,
          name: a.name,
          artist_type: a.artist_type,
        }) satisfies ArtistByKeyword,
    )
    this.setStore("alias", "searchResult", searchResult)
  }
}
