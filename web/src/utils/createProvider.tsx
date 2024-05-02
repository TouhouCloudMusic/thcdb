import { JSX, createContext, useContext } from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";

export interface Provider<T> {
	(props: { children: JSX.Element; data: T }): JSX.Element;
}

export function createProvider<T extends object, U>(
	createController: (store: T, setStore: SetStoreFunction<T>) => U
): [Provider<T>, () => U] {
	const Context = createContext<U>();
	const Provider: Provider<T> = (props) => {
		const [state, setState] = createStore(props.data);
		const controller = createController(state, setState);
		return (
			<Context.Provider value={controller}>
				{props.children}
			</Context.Provider>
		);
	};
	return [Provider, () => useContext(Context) as U];
}
