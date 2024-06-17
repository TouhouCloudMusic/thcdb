import { ArtistType, Prisma } from "@prisma/client"
import { action, redirect } from "@solidjs/router"
import * as v from "valibot"
import { ArtistDataByID } from "~/database/artist/find_artist_by_id"
import { usePrisma } from "~/database/prisma_singleton"
import { ArtistFormSchema } from "./form_schema"
import { ArtistForm } from "./type"
import { Nullable } from "vitest"

// eslint-disable-next-line @typescript-eslint/require-await
export async function createOrUpdateArtist(
	formData: ArtistForm,
	initData: ArtistDataByID | undefined
) {
	"use server"
	v.parse(ArtistFormSchema, formData)
	const prisma = usePrisma()
	const artistID = BigInt(formData.id)
	// 创建新艺术家
	if (!initData) {
		const memberData: Prisma.GroupMemberCreateManyInput[] =
			formData.member?.map(
				(member) =>
					({
						...(member.isText ?
							{
								name: member.name,
							}
						:	{
								[formData.type === "Person" ? "group_id" : "artist_id"]: BigInt(
									member.artistID
								),
							}),
						join_year: member.joinYear,
						leave_year: member.leaveYear,
					}) as Prisma.GroupMemberCreateManyInput
			) ?? []

		await prisma.artist.create({
			data: {
				name: formData.name,
				type: formData.type,
				...(memberData.length > 0 && {
					[formData.type === "Person" ? "member_of" : "members"]: {
						createMany: { data: memberData },
					},
				}),
			},
		})
	}
	// 更新现有艺术家
	else {
		const oldMemberList =
			initData[formData.type === "Person" ? "member_of" : "members"]

		const oldMemberIDList = oldMemberList.map((member) => member.id)

		const updateMemberArr = formData.member
			?.filter((member) => member.groupMemberID !== "")
			.filter((member) =>
				oldMemberIDList.includes(BigInt(member.groupMemberID))
			)
			.filter(
				(member) =>
					member.joinYear !==
						oldMemberList.find((m) => m.id === BigInt(member.groupMemberID))
							?.join_year ||
					member.leaveYear !==
						oldMemberList.find((m) => m.id === BigInt(member.groupMemberID))
							?.leave_year
			)
			.map((member) => ({
				where: {
					id: BigInt(member.groupMemberID),
				} as Prisma.GroupMemberWhereUniqueInput,
				data: {
					join_year: member.joinYear,
					leave_year: member.leaveYear,
				},
			}))

		const newMemberIDList =
			formData.member?.map((member) => BigInt(member.groupMemberID)) ?? []

		// 添加新成员
		const newGroupMembers = formData.member?.filter(
			(member) => member.groupMemberID === ""
		)

		const createMemberDataArr: Prisma.GroupMemberCreateManyInput[] = []
		newGroupMembers?.map((member) => {
			createMemberDataArr.push({
				...(member.isText ?
					{ name: member.name }
				:	{
						[formData.type === "Person" ? "group_id" : "artist_id"]: BigInt(
							member.artistID
						),
					}),
				join_year: member.joinYear,
				leave_year: member.leaveYear,
			})
		})

		interface UpdateData_Member {
			deleteMany?: Prisma.GroupMemberScalarWhereInput
			createMany?: Prisma.GroupMemberCreateManyArtistInputEnvelope
		}

		const deletedMembers = oldMemberIDList.filter(
			(id) => !newMemberIDList.includes(id)
		)

		const artistNameChanged = formData.name !== initData.name
		const artistTypeChanged = initData.type !== formData.type
		const deletedSomeMember = deletedMembers.length > 0
		const updatedSomeMember = updateMemberArr !== undefined
		const createdSomeMember = createMemberDataArr.length > 0
		const memberListChanged =
			artistTypeChanged ||
			deletedSomeMember ||
			updatedSomeMember ||
			createdSomeMember

		const updateData = {
			...(artistNameChanged && { name: formData.name }),
			...(artistTypeChanged && { type: formData.type }),
			...(memberListChanged &&
				({
					[formData.type === "Group" ? "members" : "member_of"]: {
						...((artistTypeChanged || deletedSomeMember) && {
							deleteMany:
								artistTypeChanged ?
									({
										OR: [{ group_id: artistID }, { artist_id: artistID }],
									} as Prisma.GroupMemberScalarWhereInput)
								:	({
										id: {
											in: deletedMembers,
										},
									} as Prisma.GroupMemberScalarWhereInput),
						}),
						...(createdSomeMember && {
							createMany: {
								data: createMemberDataArr,
							} as Prisma.GroupMemberCreateManyArtistInputEnvelope,
						}),
					},
				} as { [key in "members" | "member_of"]?: UpdateData_Member })),
		}
		const sessionArray = []
		// TODO: raw sql
		updateMemberArr?.map((update) => {
			sessionArray.push(prisma.groupMember.update(update))
		})
		sessionArray.push(
			prisma.artist.update({
				where: {
					id: artistID,
				},
				data: updateData,
			})
		)
		await prisma.$transaction(sessionArray)
	}
	return 0
}

export const submitAction = action(
	async (formData: ArtistForm, initData: ArtistDataByID | undefined) => {
		console.log(formData)
		try {
			const res = await createOrUpdateArtist(formData, initData)
			console.log(res === 0 && "Ok")
		} catch (error) {
			console.log(error)
		}

		throw redirect(`add/artist/${formData.id}`)
	},
	"add_artist"
)
