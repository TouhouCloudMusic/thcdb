import { createContext, useContext, type JSXElement } from "solid-js"
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

/**
 * @deprecated 基于类的Controller不能Split，故而放弃
 *  */
export function createProviderC<T extends object, U>(
  controllerClass: new (store: T, setStore: SetStoreFunction<T>) => U,
): [Provider<T>, () => U] {
  const Context = createContext<U>()
  const Provider: Provider<T> = (props) => {
    const [state, setState] = createStore(props.defaultState)
    const controller = new controllerClass(state, setState)
    return (
      <Context.Provider value={controller}>{props.children}</Context.Provider>
    )
  }
  return [Provider, () => useContext(Context)!]
}
