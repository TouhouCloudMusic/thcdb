type ApiResponse<T> = (
	| {
			data: {
				status: string
				data: T
			}
			error?: undefined
	  }
	| {
			data?: undefined
			error:
				| {
						message: string
				  }
				| undefined
	  }
) & {
	response: Response
}

export function handleApiResponse<T>(res: ApiResponse<T>): T {
	if (res.data) {
		return res.data.data
	}

	if (res.error) {
		throw new Error(res.error.message)
	}

	throw new Error(res.response.statusText)
}
