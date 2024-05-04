/* eslint-disable solid/reactivity */
import { JSX, createContext, useContext } from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";

export type Provider<T> = (props: {
	children: JSX.Element;
	defaultState: T;
}) => JSX.Element;

export function createProvider<T extends object, U>(
	createController: (store: T, setStore: SetStoreFunction<T>) => U
): [Provider<T>, () => U] {
	const Context = createContext<U>();
	const Provider: Provider<T> = (props) => {
		const [state, setState] = createStore(props.defaultState);
		const controller = createController(state, setState);
		return (
			<Context.Provider value={controller}>
				{props.children}
			</Context.Provider>
		);
	};
	return [Provider, () => useContext(Context) as U];
}
