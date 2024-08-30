import { SolidClientAuth } from "edge-auth-solid-start/client"

export const clientAuthHelper = new SolidClientAuth({
	baseUrl: "http://localhost:3000",
})
