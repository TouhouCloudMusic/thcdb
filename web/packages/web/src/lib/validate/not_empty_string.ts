export function notNullString(str: string | undefined) {
	return str !== undefined && str.length > 0
}
