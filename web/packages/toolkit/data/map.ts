import { dual } from "./dual"

export const getOrInsert: {
	<K, V>(key: K, $default: V): (self: Map<K, V>) => V
	<K, V>(self: Map<K, V>, key: K, $default: V): V
} = dual(3, <K, V>(self: Map<K, V>, key: K, $default: V): V => {
	let v = self.get(key)
	if (v === undefined) {
		v = $default
		self.set(key, v)
	}
	return v
})

export const getOrInsertWith: {
	<K, V>(key: K, $default: () => V): (self: Map<K, V>) => V
	<K, V>(self: Map<K, V>, key: K, $default: () => V): V
} = dual(3, <K, V>(self: Map<K, V>, key: K, $default: () => V): V => {
	let v = self.get(key)
	if (v === undefined) {
		v = $default()
		self.set(key, v)
	}
	return v
})
