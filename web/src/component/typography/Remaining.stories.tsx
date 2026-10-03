import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { colors, fonts, px } from "~/style/tokens.stylex"
import { StoryLayout } from "~/utils/adapter/storybook"

const styles = stylex.create({
	root: {
		maxWidth: px[1024],
		marginInline: "auto",
		padding: px[32],
		color: colors.textPrimary,
		fontFamily: fonts.sans,
	},
	row: {
		display: "grid",
		gridTemplateColumns: `${px[64]} minmax(0, 1fr)`,
		gap: px[16],
		paddingBlock: px[16],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: colors.border,
	},
	label: { fontSize: "14px", lineHeight: 1.5 },
	sample: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
	sources: { marginTop: px[12], fontSize: "12px", lineHeight: 1.5 },
	source: { display: "flex", flexDirection: "column", marginTop: px[8] },
})

const samples = stylex.create({
	sample0: {
		fontSize: "30px",
		fontWeight: 200,
		letterSpacing: "-0.025em",
		lineHeight: "36px",
	},
	sample1: {
		fontSize: "20px",
		fontWeight: 300,
		letterSpacing: "-0.025em",
		lineHeight: "28px",
	},
	sample2: {
		fontSize: "14px",
		fontWeight: 300,
		letterSpacing: "-0.025em",
		lineHeight: "20px",
	},
	sample3: {
		fontSize: "18px",
		fontWeight: 300,
		letterSpacing: "0",
		lineHeight: "28px",
	},
	sample4: {
		fontSize: "18px",
		fontWeight: 300,
		letterSpacing: "0",
		lineHeight: 1.625,
	},
	sample5: {
		fontSize: "16px",
		fontWeight: 300,
		letterSpacing: "0",
		lineHeight: 1.5,
	},
	sample6: {
		fontSize: "16px",
		fontWeight: 300,
		letterSpacing: "0",
		lineHeight: 1.625,
	},
	sample7: {
		fontSize: "16px",
		fontWeight: 300,
		letterSpacing: "0.025em",
		lineHeight: 1.5,
	},
	sample8: {
		fontSize: "14px",
		fontWeight: 300,
		letterSpacing: "0",
		lineHeight: "20px",
	},
	sample9: {
		fontSize: "14px",
		fontWeight: 300,
		letterSpacing: "0",
		lineHeight: 1.375,
	},
	sample10: {
		fontSize: "12px",
		fontWeight: 300,
		letterSpacing: "0",
		lineHeight: "16px",
	},
	sample11: {
		fontSize: "36px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "40px",
	},
	sample13: {
		fontSize: "18px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "28px",
	},
	sample14: {
		fontSize: "16px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "24px",
	},
	sample15: {
		fontSize: "16px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: 1.5,
	},
	sample16: {
		fontSize: "15px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: 1.375,
	},
	sample17: {
		fontSize: "14px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "20px",
	},
	sample18: {
		fontSize: "14px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "1.5rem",
	},
	sample19: {
		fontSize: "14px",
		fontWeight: 400,
		letterSpacing: ".025em",
		lineHeight: "20px",
	},
	sample20: {
		fontSize: "14px",
		fontWeight: 400,
		letterSpacing: ".05em",
		lineHeight: 1.625,
	},
	sample21: {
		fontSize: "12px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "16px",
	},
	sample22: {
		fontSize: "20px",
		fontWeight: 500,
		letterSpacing: "0",
		lineHeight: "28px",
	},
	sample23: {
		fontSize: "15px",
		fontWeight: 500,
		letterSpacing: "0",
		lineHeight: 1.5,
	},
	sample24: {
		fontSize: "14px",
		fontWeight: 500,
		letterSpacing: "0",
		lineHeight: "20px",
	},
	sample25: {
		fontSize: "12px",
		fontWeight: 500,
		letterSpacing: "0",
		lineHeight: "16px",
	},
	sample26: {
		fontSize: "14px",
		fontWeight: 600,
		letterSpacing: "0",
		lineHeight: "20px",
	},
	sample27: {
		fontSize: "14px",
		fontWeight: 600,
		letterSpacing: ".025em",
		lineHeight: "20px",
	},
	sample28: {
		fontSize: "14px",
		fontWeight: 300,
		letterSpacing: "0.025em",
		lineHeight: 1.5,
		textTransform: "uppercase",
	},
	sample29: {
		fontSize: "12px",
		fontWeight: 500,
		letterSpacing: "0.05em",
		lineHeight: "16px",
		textTransform: "uppercase",
	},
	sample30: {
		fontSize: "12px",
		fontWeight: 500,
		letterSpacing: "0.1em",
		lineHeight: "16px",
		textTransform: "uppercase",
	},
	sample31: {
		fontSize: "12px",
		fontWeight: 500,
		letterSpacing: "0.22em",
		lineHeight: "16px",
		textTransform: "uppercase",
	},
	sample32: {
		fontSize: "11px",
		fontWeight: 500,
		letterSpacing: ".18em",
		lineHeight: 1.5,
		textTransform: "uppercase",
	},
	sample33: {
		fontSize: "14px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "20px",
		fontFamily: fonts.mono,
	},
	sample34: {
		fontSize: "12px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "16px",
		fontFamily: fonts.mono,
	},
	sample35: {
		fontSize: "12px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: "1.25rem",
		fontFamily: fonts.mono,
	},
	sample36: {
		fontSize: "16px",
		fontWeight: 300,
		letterSpacing: "-0.025em",
		lineHeight: "24px",
		fontVariantNumeric: "tabular-nums",
	},
	sample37: {
		fontSize: "16px",
		fontWeight: 400,
		letterSpacing: "0",
		lineHeight: 1.5,
		fontVariantNumeric: "tabular-nums",
	},
})

const GROUPS = {
	"200": [
		{
			size: 30,
			styles: samples.sample0,
			origins: [
				{
					path: "web/src/component/form/SearchDialog/__internal.tsx:21",
					storyId: "form-searchdialog--default",
					storyName: "form/SearchDialog / Default",
					note: "",
				},
			],
		},
	],
	"300-tight": [
		{
			size: 20,
			styles: samples.sample1,
			origins: [
				{
					path: "web/src/view/release/Info/comp/ReleaseInfoTracks.tsx:56",
					storyId: "view-release--default",
					storyName: "View/Release / Default",
					note: "",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample2,
			origins: [
				{
					path: "web/src/view/Homepage/component/ExploreSection.tsx:19",
					storyId: "view-homepage--default",
					storyName: "View/Homepage / Default",
					note: "",
				},
			],
		},
	],
	"300": [
		{
			size: 18,
			styles: samples.sample3,
			origins: [
				{
					path: "web/src/view/tag/Info/Relations.tsx:45",
					storyId: "view-tag--default",
					storyName: "View/Tag / Default",
					note: "",
				},
				{
					path: "web/src/style/primitives.ts:43",
					storyId: "view-label-edit--default",
					storyName: "View/Label/Edit / Default",
					note: "",
				},
				{
					path: "web/src/view/Homepage/component/ReleaseCard.tsx:109",
					storyId: "view-homepage-releasecard--default",
					storyName: "View/Homepage/ReleaseCard / Default",
					note: "",
				},
				{
					path: "web/src/view/song/Info/comp/SongInfoTitleAndCreditName.tsx:38",
					storyId: "view-song--default",
					storyName: "View/Song / Default",
					note: "",
				},
				{
					path: "web/src/component/route.tsx:53",
					storyId: "component-route--auth-required",
					storyName: "Component/Route / Auth Required",
					note: "",
				},
			],
		},
		{
			size: 18,
			styles: samples.sample4,
			origins: [
				{
					path: "web/src/view/song/Info/comp/SongInfoLyrics.tsx:31",
					storyId: "view-song--default",
					storyName: "View/Song / Default",
					note: "Lyrics",
				},
			],
		},
		{
			size: 16,
			styles: samples.sample5,
			origins: [
				{
					path: "web/src/view/Homepage/component/EventsCard.tsx:56",
					storyId: "view-homepage--default",
					storyName: "View/Homepage / Default",
					note: "",
				},
			],
		},
		{
			size: 16,
			styles: samples.sample6,
			origins: [
				{
					path: "web/src/view/event/Info/index.tsx:57",
					storyId: "view-event--default",
					storyName: "View/Event / Default",
					note: "",
				},
			],
		},
		{
			size: 16,
			styles: samples.sample7,
			origins: [
				{
					path: "web/src/view/song/Info/comp/SongInfoTitleAndCreditName.tsx:18",
					storyId: "view-song--default",
					storyName: "View/Song / Default",
					note: "",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample8,
			origins: [
				{
					path: "web/src/view/Homepage/component/ArtistCard.tsx:59",
					storyId: "view-homepage-artistcard--default",
					storyName: "View/Homepage/ArtistCard / Default",
					note: "",
				},
				{
					path: "web/src/component/Sidebar/index.tsx:21",
					storyId: "component-header--default",
					storyName: "Component/Header / Default",
					note: "Open navigation menu",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample9,
			origins: [
				{
					path: "web/src/view/Homepage/component/TagsCard.tsx:66",
					storyId: "view-homepage--default",
					storyName: "View/Homepage / Default",
					note: "",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample10,
			origins: [
				{
					path: "web/src/view/Homepage/component/ReleaseCard.tsx:121",
					storyId: "view-homepage-releasecard--default",
					storyName: "View/Homepage/ReleaseCard / Default",
					note: "",
				},
			],
		},
	],
	"400": [
		{
			size: 36,
			styles: samples.sample11,
			origins: [
				{
					path: "web/src/view/NotFound.tsx:17",
					storyId: "view-error--not-found-page",
					storyName: "View/Error / Not Found Page",
					note: "",
				},
			],
		},
		{
			size: 18,
			styles: samples.sample13,
			origins: [
				{
					path: "web/src/view/user/Profile.tsx:176",
					storyId: "view-user-profile--default",
					storyName: "View/User/Profile / Default",
					note: "",
				},
				{
					path: "web/src/view/release/Info/comp/ReleaseInfoTitleAndArtist.tsx:22",
					storyId: "view-release--default",
					storyName: "View/Release / Default",
					note: "",
				},
				{
					path: "web/src/view/tag/edit/comp/TagFormActions.tsx:18",
					storyId: "view-tag-edit--submission-error",
					storyName: "View/Tag/Edit / Submission Error",
					note: "",
				},
			],
		},
		{
			size: 16,
			styles: samples.sample14,
			origins: [
				{
					path: "web/src/view/tag/TagItem.tsx:18",
					storyId: "view-explore-tag--list",
					storyName: "View/Explore/Tag / List",
					note: "",
				},
			],
		},
		{
			size: 16,
			styles: samples.sample15,
			origins: [
				{
					path: "web/src/view/tag/Info/Overview.tsx:60",
					storyId: "view-tag--default",
					storyName: "View/Tag / Default",
					note: "",
				},
			],
		},
		{
			size: 15,
			styles: samples.sample16,
			origins: [
				{
					path: "web/src/view/user/Profile.tsx:333",
					storyId: "view-user-profile--default",
					storyName: "View/User/Profile / Default",
					note: "Activity",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample17,
			origins: [
				{
					path: "web/src/component/feature/entity_explore/ExploreFilterField.tsx:14",
					storyId: "component-feature-explorefilterbar--default",
					storyName: "Component/Feature/ExploreFilterBar / Default",
					note: "",
				},
				{
					path: "web/src/view/comment/CommentThread.tsx:108",
					storyId: "view-comment-entitycomments--with-comments",
					storyName: "View/Comment/EntityComments / With Comments",
					note: "",
				},
				{
					path: "web/src/style/primitives.ts:76",
					storyId: "view-explore-song--list",
					storyName: "View/Explore/Song / List",
					note: "",
				},
				{
					path: "web/src/view/notification/InboxPage.tsx:98",
					storyId: "page-notificationinboxpage--inbox",
					storyName: "Page/NotificationInboxPage / Inbox",
					note: "",
				},
				{
					path: "web/src/component/atomic/form/select/index.tsx:21",
					storyId: "component-feature-explorefilterbar--default",
					storyName: "Component/Feature/ExploreFilterBar / Default",
					note: "",
				},
				{
					path: "web/src/view/comment/EntityComments.tsx:44",
					storyId: "view-comment-entitycomments--empty",
					storyName: "View/Comment/EntityComments / Empty",
					note: "",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample18,
			origins: [
				{
					path: "web/src/route/song-lyrics/$id.tsx:27",
					storyId: "view-song-lyrics--default",
					storyName: "View/Song/Lyrics / Default",
					note: "",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample19,
			origins: [
				{
					path: "web/src/view/user/Profile.tsx:147",
					storyId: "view-user-profile--default",
					storyName: "View/User/Profile / Default",
					note: "",
				},
				{
					path: "web/src/style/primitives.ts:53",
					storyId: "view-label--default",
					storyName: "View/Label / Default",
					note: "",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample20,
			origins: [
				{
					path: "web/src/component/display/credit/CreditList.tsx:42",
					storyId: "view-release--default",
					storyName: "View/Release / Default",
					note: "",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample21,
			origins: [
				{
					path: "web/src/view/comment/CommentThread.tsx:103",
					storyId: "view-comment-entitycomments--with-comments",
					storyName: "View/Comment/EntityComments / With Comments",
					note: "",
				},
			],
		},
	],
	"500": [
		{
			size: 20,
			styles: samples.sample22,
			origins: [
				{
					path: "web/src/view/admin/users.tsx:39",
					storyId: "view-admin-users--default",
					storyName: "View/Admin/Users / Default",
					note: "Edit roles",
				},
			],
		},
		{
			size: 15,
			styles: samples.sample23,
			origins: [
				{
					path: "web/src/view/collection/FollowedCollectionRow.tsx:48",
					storyId: "view-user-profile-collectionrow--followed",
					storyName: "View/User/Profile/CollectionRow / Followed",
					note: "",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample24,
			origins: [
				{
					path: "web/src/view/collection/CollectionFormDialog.tsx:50",
					storyId: "view-collection-collectionformdialog--default",
					storyName: "View/Collection/CollectionFormDialog / Default",
					note: "",
				},
				{
					path: "web/src/view/label/edit/comp/LabelFoundersField.tsx:49",
					storyId: "view-label-edit--default",
					storyName: "View/Label/Edit / Default",
					note: "",
				},
				{
					path: "web/src/view/image_queue/user.tsx:111",
					storyId: "page-userimagequeuepage--default",
					storyName: "Page/UserImageQueuePage / Default",
					note: "Controls: state = empty",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample25,
			origins: [
				{
					path: "web/src/view/user/Profile.tsx:269",
					storyId: "view-user-profile--default",
					storyName: "View/User/Profile / Default",
					note: "",
				},
				{
					path: "web/src/view/comment/CommentThread.tsx:115",
					storyId: "view-comment-entitycomments--with-comments",
					storyName: "View/Comment/EntityComments / With Comments",
					note: "Reply",
				},
			],
		},
	],
	"600": [
		{
			size: 14,
			styles: samples.sample26,
			origins: [
				{
					path: "web/src/view/comment/CommentThread.tsx:92",
					storyId: "view-comment-entitycomments--with-comments",
					storyName: "View/Comment/EntityComments / With Comments",
					note: "",
				},
			],
		},
		{
			size: 14,
			styles: samples.sample27,
			origins: [
				{
					path: "web/src/component/Footer/index.tsx:15",
					storyId: "footer--default",
					storyName: "Footer / Default",
					note: "",
				},
			],
		},
	],
	Uppercase: [
		{
			size: 14,
			styles: samples.sample28,
			origins: [
				{
					path: "web/src/view/release/Info/ReleaseInfoTabs.tsx:19",
					storyId: "view-release-infotabs--default",
					storyName: "View/Release/InfoTabs / Default",
					note: "",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample29,
			origins: [
				{
					path: "web/src/view/song/Info/comp/SongInfoLanguages.tsx:11",
					storyId: "view-song--default",
					storyName: "View/Song / Default",
					note: "",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample30,
			origins: [
				{
					path: "web/src/view/song/Info/comp/SongInfoLyrics.tsx:23",
					storyId: "view-song--default",
					storyName: "View/Song / Default",
					note: "Lyrics",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample31,
			origins: [
				{
					path: "web/src/view/user/edit_profile/index.tsx:113",
					storyId: "view-user-editprofile--default",
					storyName: "View/User/EditProfile / Default",
					note: "",
				},
			],
		},
		{
			size: 11,
			styles: samples.sample32,
			origins: [
				{
					path: "web/src/component/Header/index.tsx:185",
					storyId: "component-header--default",
					storyName: "Component/Header / Default",
					note: "聚焦搜索框",
				},
			],
		},
	],
	Monospace: [
		{
			size: 14,
			styles: samples.sample33,
			origins: [
				{
					path: "web/src/view/admin/users.tsx:198",
					storyId: "view-admin-users--default",
					storyName: "View/Admin/Users / Default",
					note: "",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample34,
			origins: [
				{
					path: "web/src/view/correction/CorrectionHistorySection.tsx:56",
					storyId: "view-song--default",
					storyName: "View/Song / Default",
					note: "History",
				},
			],
		},
		{
			size: 12,
			styles: samples.sample35,
			origins: [
				{
					path: "web/src/view/correction/Detail.tsx:119",
					storyId: "view-correction-detail--default",
					storyName: "View/Correction/Detail / Default",
					note: "",
				},
			],
		},
	],
	Tabular: [
		{
			size: 16,
			styles: samples.sample36,
			origins: [
				{
					path: "web/src/view/release/Info/comp/ReleaseInfoTracks.tsx:20",
					storyId: "view-release--default",
					storyName: "View/Release / Default",
					note: "",
				},
			],
		},
		{
			size: 16,
			styles: samples.sample37,
			origins: [
				{
					path: "web/src/view/user/Profile.tsx:169",
					storyId: "view-user-profile--default",
					storyName: "View/User/Profile / Default",
					note: "",
				},
			],
		},
	],
}

function RemainingTypography(props: {
	group: keyof typeof GROUPS
	sampleText: string
}) {
	return (
		<main {...stylex.attrs(styles.root)}>
			<For each={GROUPS[props.group]}>
				{(sample) => (
					<section {...stylex.attrs(styles.row)}>
						<div {...stylex.attrs(styles.label)}>{sample.size}</div>
						<div>
							<div {...stylex.attrs(styles.sample, sample.styles)}>
								{props.sampleText}
							</div>
							<details {...stylex.attrs(styles.sources)}>
								<summary>来源</summary>
								<For each={sample.origins}>
									{(origin) => (
										<div {...stylex.attrs(styles.source)}>
											<a
												href={`/?path=/story/${origin.storyId}`}
												target="_top"
											>
												{origin.storyName}
												{origin.note ? ` · ${origin.note}` : ""}
											</a>
											<span>{origin.path}</span>
										</div>
									)}
								</For>
							</details>
						</div>
					</section>
				)}
			</For>
		</main>
	)
}

const meta = {
	title: "Design System/Typography/Remaining",
	component: RemainingTypography,
	parameters: { layout: StoryLayout.FullScreen },
	args: {
		group: "300",
		sampleText:
			"东方红魔乡 · Scarlet Devil\n月明かりを追い越して、遠い幻想の向こうへ。",
	},
	argTypes: { group: { control: "select", options: Object.keys(GROUPS) } },
} satisfies Meta<typeof RemainingTypography>

export default meta
type Story = StoryObj<typeof meta>
export const Overview: Story = {}
