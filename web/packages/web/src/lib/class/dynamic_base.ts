// eslint-disable-next-line @typescript-eslint/no-extraneous-class
const InnerDynamicBase = class {
	constructor(props: object) {
		Object.assign(this, props)
	}
} as new <T extends object>(base: T) => T

// @ts-expect-error
export class DynamicBase<T extends object> extends InnerDynamicBase<T> {}
