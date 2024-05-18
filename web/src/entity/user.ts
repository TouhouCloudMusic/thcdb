export interface User {
	id: number
	username: string
}

export interface AuthUser extends User {
	password: string
}
