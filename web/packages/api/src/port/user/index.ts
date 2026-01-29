import { FetchClient } from "../../http"
import {
	adaptApiResultMessage,
	adaptApiResultOptional,
	adaptFetchMessageResponseFromResponse,
} from "../../shared"
import type { Path } from "../../shared"

export async function profile() {
	const res = await FetchClient.GET("/profile", {})

	return adaptApiResultOptional(res)
}

export async function profileWithName(options: {
	path: Path<"profile_with_name">
}) {
	const res = await FetchClient.GET("/profile/{name}", {
		params: { path: options.path },
	})

	return adaptApiResultOptional(res)
}

export async function updateBio(bio: string) {
	const response = await fetch("/api/profile/bio", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "text/plain",
		},
		body: bio,
	})

	const res = await adaptFetchMessageResponseFromResponse(response)
	return adaptApiResultMessage(res)
}

export async function uploadAvatar(file: File) {
	const body = new FormData()
	body.append("data", file)

	const response = await fetch("/api/avatar", {
		method: "POST",
		headers: {
			Accept: "application/json",
		},
		body,
	})

	const res = await adaptFetchMessageResponseFromResponse(response)
	return adaptApiResultMessage(res)
}

export async function uploadProfileBanner(file: File) {
	const body = new FormData()
	body.append("data", file)

	const response = await fetch("/api/profile-banner", {
		method: "POST",
		headers: {
			Accept: "application/json",
		},
		body,
	})

	const res = await adaptFetchMessageResponseFromResponse(response)
	return adaptApiResultMessage(res)
}
