import { createContext, type JSXElement, useContext } from "solid-js"
import { createStore, type SetStoreFunction } from "solid-js/store"

export type Provider<T> = (props: {
  children: JSXElement
  defaultState: T
}) => JSXElement

export function createProvider<T extends object, U>(
  createController: (store: T, setStore: SetStoreFunction<T>) => U,
): [Provider<T>, () => U] {
  const Context = createContext<U>()
  const Provider: Provider<T> = (props) => {
    const [state, setState] = createStore(props.defaultState)
    const controller = createController(state, setState)
    return (
      <Context.Provider value={controller}>{props.children}</Context.Provider>
    )
  }
  return [Provider, () => useContext(Context)!]
}
