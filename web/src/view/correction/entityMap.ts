import type { EntityType } from "@thc/api"

export type CorrectionHistoryEntityType =
	| "artist"
	| "label"
	| "release"
	| "song"
	| "tag"
	| "event"
	| "song-lyrics"
	| "credit-role"

export type EntityDetailType = Exclude<
	CorrectionHistoryEntityType,
	"song-lyrics" | "credit-role"
>

type EntityDetailRoute = `/${EntityDetailType}/$id`

type CorrectionEntityDetailRoute = `/${CorrectionHistoryEntityType}/$id`

type EntityEditRoute = `/${EntityDetailType}/$id/edit`

type EntityCorrectionsRoute = `/${EntityDetailType}/$id/corrections`

type EntityRouteSet = {
	detail: EntityDetailRoute
	edit: EntityEditRoute
	corrections: EntityCorrectionsRoute
}

type EntityBaseRouteMap = Record<EntityDetailType, EntityDetailRoute>

type EntityDetailLabelMap = Record<EntityDetailType, string>

function buildBaseRouteMap(labels: EntityDetailLabelMap) {
	// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
	return Object.fromEntries(
		// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
		(Object.keys(labels) as EntityDetailType[]).map((entity) => [
			entity,
			`/${entity}/$id`,
		]),
	) as EntityBaseRouteMap
}

function buildEntityRouteMap(baseRoutes: EntityBaseRouteMap) {
	// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
	return Object.fromEntries(
		Object.entries(baseRoutes).map(([entity, baseRoute]) => [
			entity,
			{
				detail: baseRoute,
				edit: `${baseRoute}/edit`,
				corrections: `${baseRoute}/corrections`,
			},
		]),
	) as Record<EntityDetailType, EntityRouteSet>
}

export const ENTITY_LABEL_MAP = {
	artist: "Artist",
	label: "Label",
	release: "Release",
	song: "Song",
	tag: "Tag",
	event: "Event",
} as const satisfies EntityDetailLabelMap

export const ENTITY_BASE_ROUTE_MAP = buildBaseRouteMap(ENTITY_LABEL_MAP)

export const ENTITY_PAGE_ROUTE_MAP = buildEntityRouteMap(ENTITY_BASE_ROUTE_MAP)

export const ENTITY_HISTORY_MAP: Record<
	EntityType,
	CorrectionHistoryEntityType
> = {
	Artist: "artist",
	Label: "label",
	Release: "release",
	Song: "song",
	Tag: "tag",
	Event: "event",
	SongLyrics: "song-lyrics",
	CreditRole: "credit-role",
}

export const ENTITY_ROUTE_MAP = {
	Artist: ENTITY_PAGE_ROUTE_MAP.artist.detail,
	Label: ENTITY_PAGE_ROUTE_MAP.label.detail,
	Release: ENTITY_PAGE_ROUTE_MAP.release.detail,
	Song: ENTITY_PAGE_ROUTE_MAP.song.detail,
	Tag: ENTITY_PAGE_ROUTE_MAP.tag.detail,
	Event: ENTITY_PAGE_ROUTE_MAP.event.detail,
	SongLyrics: "/song-lyrics/$id",
	CreditRole: "/credit-role/$id",
} as const satisfies Record<EntityType, CorrectionEntityDetailRoute>

export const ENTITY_EDIT_ROUTE_MAP = {
	Artist: ENTITY_PAGE_ROUTE_MAP.artist.edit,
	Label: ENTITY_PAGE_ROUTE_MAP.label.edit,
	Release: ENTITY_PAGE_ROUTE_MAP.release.edit,
	Song: ENTITY_PAGE_ROUTE_MAP.song.edit,
	Tag: ENTITY_PAGE_ROUTE_MAP.tag.edit,
	Event: ENTITY_PAGE_ROUTE_MAP.event.edit,
	SongLyrics: undefined,
	CreditRole: undefined,
} as const satisfies Record<EntityType, EntityEditRoute | undefined>
