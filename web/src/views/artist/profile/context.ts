import { createContext, useContext } from "solid-js"

import { type ArtistProfilePageController } from "./controller"

export const Context = createContext<ArtistProfilePageController>()
export const useController = () => useContext(Context)!
