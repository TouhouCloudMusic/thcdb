export type NotificationPayload = {
	summary?: string | null
	target_url?: string | null
	// Allow forward-compatible extra fields.
	[key: string]: unknown
}

export type NotificationItem = {
	id: number
	notification_kind: string
	target_type: string
	target_id: number
	payload: NotificationPayload
	is_read: boolean
	created_at: string
}
