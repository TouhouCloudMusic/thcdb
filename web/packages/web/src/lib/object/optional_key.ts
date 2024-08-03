export function optionalKey<
	O extends Record<string, unknown>,
	K extends keyof O = keyof O extends string ? keyof O : never,
>(expr: boolean, key: K, value: O[K]) {
	return expr ? { [key]: value } : {}
}

export function appendOptionalKey<const O extends object, K extends string>(
	obj: O,
	expr: boolean,
	key: conform<K, string & validatePath<Required<O>, K>>,
	value: getPath<O, K>
) {
	if (!expr) return obj

	return {
		...obj,
		[key]: value,
	}
}

type keyOf<o> =
	o extends readonly unknown[] ?
		number extends o["length"] ?
			`${number}`
		:	keyof o & `${number}`
	:	{
			[k in keyof o]: k extends string ? k
			: k extends number ? `${k}`
			: never
		}[keyof o]

type getKey<o, k> =
	k extends keyof o ? o[k]
	: k extends `${infer n extends number & keyof o}` ? o[n]
	: never

type getPath<o, path extends string> =
	path extends `${infer head}.${infer tail}` ? getPath<getKey<o, head>, tail>
	:	getKey<o, path>

type validatePath<o, path extends string, prefix extends string = ""> =
	path extends `${infer head}.${infer tail}` ?
		head extends keyOf<o> ?
			validatePath<getKey<o, head>, tail, `${prefix}${head}.`>
		:	`Key '${head}' is not valid following '${prefix}'`
	:	{
			// find suffixes that would make the segment valid
			[k in keyOf<o>]: k extends `${path}${string}` ? `${prefix}${k}` : never
		}[keyOf<o>]

type conform<t, base> = t extends base ? t : base
