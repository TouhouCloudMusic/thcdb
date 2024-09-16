import { SolidClientAuth } from "edgedb-auth-solid-start/client"

export const clientAuthHelper = new SolidClientAuth({
	baseUrl: "http://localhost:3000",
})
