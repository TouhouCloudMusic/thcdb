import { User } from "~/entity/user"

export interface UserPageData {
	username: string
	timeline: TimeLineItem[]
}

export type TimeLineItem =
	| ReviewAction
	| RatingAction
	| FollowAction
	| EditAction

interface TimelineActionBase {
	user: User
	time: string
	action_type: string
	target_type: string
	target_id: number
	target_data: object
}

export interface ReviewAction extends TimelineActionBase {
	action_type: "review"
	target_type: "release" | "song"
	target_data: {
		title: string
	}
}

interface RatingAction extends Omit<ReviewAction, "action_type"> {
	action_type: "rating"
}

interface FollowAction extends TimelineActionBase {
	action_type: "follow"
	target_type: "user"
}

interface EditAction extends TimelineActionBase {
	action_type: "edit"
	target_type: "release" | "song"
}
