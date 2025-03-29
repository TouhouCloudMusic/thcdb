export type paths = {
    "/artist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_artist_by_keyword"];
        put?: never;
        post: operations["create_artist"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_artist_by_id"];
        put?: never;
        post: operations["upsert_artist_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/avatar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["upload_avatar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/correction/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["handle_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/event": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_by_keyword"];
        put?: never;
        post: operations["create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/event/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_by_id"];
        put?: never;
        post: operations["upsert_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/label": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_label_by_keyword"];
        put?: never;
        post: operations["create_label"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/label/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_label_by_id"];
        put?: never;
        post: operations["upsert_label_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/languages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["language_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["profile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/profile/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["profile_with_name"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_release_by_keyword"];
        put?: never;
        post: operations["create_release"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_release_by_id"];
        put?: never;
        post: operations["update_release"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sign_in": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["sign_in"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sign_out": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["sign_out"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sign_up": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["sign_up"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/song": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_song_by_keyword"];
        put?: never;
        post: operations["create_song"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/song/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_song_by_id"];
        put?: never;
        post: operations["update_song"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tag": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["create_tag"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tag/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["upsert_tag_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/user_roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["user_roles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
};
export type webhooks = Record<string, never>;
export type components = {
    schemas: {
        AltName: {
            Alternative: {
                name: string;
            };
        } | {
            Translation: {
                name: string;
                /** Format: int32 */
                language_id: number;
            };
        };
        AlternativeName: {
            Alias: {
                name: string;
            };
        } | {
            Localization: {
                name: string;
                /** Format: int32 */
                language_id: number;
            };
        };
        AlternativeNameResponse: {
            name: string;
            type: components["schemas"]["AlternativeNameType"];
            /** Format: int32 */
            language_id?: number | null;
        };
        /** @enum {string} */
        AlternativeNameType: "Alias" | "Localization";
        Artist: {
            /** Format: int32 */
            id: number;
            name: string;
            artist_type: components["schemas"]["ArtistType"];
            text_alias?: string[] | null;
            /** Format: date */
            start_date?: string | null;
            start_date_precision?: null | components["schemas"]["DatePrecision"];
            /** Format: date */
            end_date?: string | null;
            end_date_precision?: null | components["schemas"]["DatePrecision"];
            aliases: number[];
            links: string[];
            localized_names: components["schemas"]["LocalizedName"][];
            members: components["schemas"]["GroupMember"][];
        };
        ArtistCorrection: {
            name: string;
            artist_type: components["schemas"]["ArtistType"];
            text_alias?: string[] | null;
            /**
             * Format: date
             * @description Birth date for a person and formation date for a group
             */
            start_date?: string | null;
            start_date_precision?: null | components["schemas"]["DatePrecision"];
            /**
             * Format: date
             * @description Death date for a person and disbandment date for a group
             */
            end_date?: string | null;
            end_date_precision?: null | components["schemas"]["DatePrecision"];
            /** @description List of Ids of the artist's aliases */
            aliases?: number[] | null;
            /** @description List of artist-related URLs */
            links?: string[] | null;
            localized_name?: components["schemas"]["NewLocalizedName"][] | null;
            members?: components["schemas"]["NewGroupMember"][] | null;
            correction_metadata: components["schemas"]["Metadata"];
        };
        /** @enum {string} */
        ArtistType: "Solo" | "Multiple" | "Unknown";
        AuthCredential: {
            username: string;
            password: string;
        };
        CreditRole: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        DataArtist: {
            /** @enum {string} */
            status: "Ok";
            data: components["schemas"]["Artist"];
        };
        DataLabelResponse: {
            status: string;
            data: components["schemas"]["Label"];
        };
        DataReleaseResponse: {
            status: string;
            data: components["schemas"]["Release"];
        };
        DataSongResponse: {
            status: string;
            data: components["schemas"]["SongResponse"];
        };
        DataUserProfile: {
            status: string;
            data: components["schemas"]["UserProfile"];
        };
        DataVecArtist: {
            /** @enum {string} */
            status: "Ok";
            data: components["schemas"]["Artist"][];
        };
        DataVecEventResponse: {
            status: string;
            data: components["schemas"]["EventResponse"][];
        };
        DataVecLabelResponse: {
            status: string;
            data: components["schemas"]["Label"][];
        };
        DataVecLanguage: {
            status: string;
            data: components["schemas"]["Language"][];
        };
        DataVecReleaseResponse: {
            status: string;
            data: components["schemas"]["Release"][];
        };
        DataVecSongResponse: {
            status: string;
            data: components["schemas"]["SongResponse"][];
        };
        Data_EventResponse: {
            /** @enum {string} */
            status: "Ok";
            data: {
                /** Format: int32 */
                id: number;
                name: string;
                short_description: string;
                description: string;
                start_date?: [
                    string,
                    "Day" | "Month" | "Year"
                ] | null;
                end_date?: [
                    string,
                    "Day" | "Month" | "Year"
                ] | null;
                alternative_names: components["schemas"]["AlternativeNameResponse"][];
            };
        };
        /** @enum {string} */
        DatePrecision: "Day" | "Month" | "Year";
        EventCorrection: {
            name: string;
            short_description: string;
            description: string;
            /** Format: date */
            start_date?: string | null;
            start_date_precision?: null | components["schemas"]["DatePrecision"];
            /** Format: date */
            end_date?: string | null;
            end_date_precision?: null | components["schemas"]["DatePrecision"];
            alternative_names: components["schemas"]["AlternativeName"][];
            correction_metadata: components["schemas"]["Metadata"];
        };
        EventResponse: {
            /** Format: int32 */
            id: number;
            name: string;
            short_description: string;
            description: string;
            start_date?: [
                string,
                "Day" | "Month" | "Year"
            ] | null;
            end_date?: [
                string,
                "Day" | "Month" | "Year"
            ] | null;
            alternative_names: components["schemas"]["AlternativeNameResponse"][];
        };
        GroupMember: {
            /** Format: int32 */
            artist_id: number;
            roles: components["schemas"]["CreditRole"][];
            join_leave: [
                "FoundingMember" | {
                    /** Format: int32 */
                    Specific: number | null;
                },
                "Unknown" | {
                    /** Format: int32 */
                    Specific: number | null;
                }
            ][];
        };
        /** @enum {string} */
        HandleCorrectionMethod: "Approve" | "Reject";
        Label: {
            /** Format: int32 */
            id: number;
            name: string;
            founded_date?: [
                string,
                "Day" | "Month" | "Year"
            ] | null;
            dissolved_date?: [
                string,
                "Day" | "Month" | "Year"
            ] | null;
            founders: number[];
            localized_names: components["schemas"]["SimpleLocalizedName"][];
        };
        Language: {
            /** Format: int32 */
            id: number;
            code: string;
            name: string;
        };
        LocalizedName: {
            language: components["schemas"]["Language"];
            name: string;
        };
        LocalizedTitle: {
            language: components["schemas"]["Language"];
            title: string;
        };
        Message: {
            /** @enum {string} */
            status: "Ok";
            message: string;
        };
        Metadata: {
            description: string;
        };
        NewCredit: {
            /** Format: int32 */
            artist_id: number;
            /** Format: int32 */
            role_id: number;
            on?: number[] | null;
        };
        NewGroupMember: {
            /** Format: int32 */
            artist_id: number;
            roles: number[];
            join_leave: [
                "FoundingMember" | {
                    /** Format: int32 */
                    Specific: number | null;
                },
                "Unknown" | {
                    /** Format: int32 */
                    Specific: number | null;
                }
            ][];
        };
        NewLabel: {
            name: string;
            /** Format: date */
            founded_date?: string | null;
            founded_date_precision?: null | components["schemas"]["DatePrecision"];
            /** Format: date */
            dissolved_date?: string | null;
            dissolved_date_precision?: null | components["schemas"]["DatePrecision"];
            localized_names: components["schemas"]["NewLocalizedName"][];
            founders: number[];
            correction_metadata: components["schemas"]["Metadata"];
        };
        NewLocalizedName: {
            /** Format: int32 */
            language_id: number;
            name: string;
        };
        NewLocalizedTitle: {
            title: string;
            /** Format: int32 */
            language_id: number;
        };
        NewSong: {
            title: string;
            languages?: number[] | null;
            localized_titles?: components["schemas"]["NewLocalizedTitle"][] | null;
            credits?: components["schemas"]["NewSongCredit"][] | null;
            correction_metadata: components["schemas"]["Metadata"];
        };
        NewSongCredit: {
            /** Format: int32 */
            artist_id: number;
            /** Format: int32 */
            role_id: number;
        };
        NewTrack: {
            Linked: {
                artists: number[];
                track_number?: string | null;
                duration?: string | null;
                /** Format: int32 */
                song_id: number;
                display_title?: string | null;
            };
        } | {
            Unlinked: {
                artists: number[];
                track_number?: string | null;
                duration?: string | null;
                display_title: string;
            };
        };
        Release: {
            /** Format: int32 */
            id: number;
            release_type: components["schemas"]["ReleaseType"];
            /** Format: date */
            release_date?: string | null;
            release_date_precision?: null | components["schemas"]["DatePrecision"];
            /** Format: date */
            recording_date_start?: string | null;
            recording_date_start_precision?: null | components["schemas"]["DatePrecision"];
            /** Format: date */
            recording_date_end?: string | null;
            recording_date_end_precision?: null | components["schemas"]["DatePrecision"];
            artists: components["schemas"]["ReleaseArtist"][];
            credits: components["schemas"]["ReleaseCredit"][];
            catalog_nums: components["schemas"]["ReleaseCatalogNumber"][];
            localized_titles: components["schemas"]["LocalizedTitle"][];
            tracks: number[];
        };
        ReleaseArtist: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        ReleaseCatalogNumber: {
            catalog_number: string;
            /** Format: int32 */
            label_id?: number | null;
        };
        ReleaseCorrection: {
            title: string;
            release_type: components["schemas"]["ReleaseType"];
            /** Format: date */
            release_date?: string | null;
            release_date_precision?: null | components["schemas"]["DatePrecision"];
            /** Format: date */
            recording_date_start?: string | null;
            recording_date_start_precision?: null | components["schemas"]["DatePrecision"];
            /** Format: date */
            recording_date_end?: string | null;
            recording_date_end_precision?: null | components["schemas"]["DatePrecision"];
            artists: number[];
            catalog_nums: components["schemas"]["ReleaseCatalogNumber"][];
            credits: components["schemas"]["NewCredit"][];
            events: number[];
            localized_titles: components["schemas"]["NewLocalizedTitle"][];
            tracks: components["schemas"]["NewTrack"][];
            correction_metadata: components["schemas"]["Metadata"];
        };
        ReleaseCredit: {
            artist: components["schemas"]["ReleaseArtist"];
            role: components["schemas"]["CreditRole"];
            on?: number[] | null;
        };
        /** @enum {string} */
        ReleaseType: "Album" | "Ep" | "Single" | "Compilation" | "Demo" | "Other";
        SimpleLocalizedName: {
            /** Format: int32 */
            language_id: number;
            name: string;
        };
        SongResponse: {
            /** Format: int32 */
            id: number;
            title: string;
            credits: {
                /** Format: int32 */
                artist_id: number;
                /** Format: int32 */
                role_id: number;
            }[];
            languages: {
                /** Format: int32 */
                id: number;
                code: string;
                name: string;
            }[];
            localized_titles: {
                /** Format: int32 */
                language_id: number;
                title: string;
            }[];
        };
        TagCorrection: {
            name: string;
            type: components["schemas"]["TagType"];
            short_description: string;
            description: string;
            alt_names: components["schemas"]["AltName"][];
            relations: components["schemas"]["TagRelation"][];
            correction_metadata: components["schemas"]["Metadata"];
        };
        TagRelation: {
            /** Format: int32 */
            related_tag_id: number;
            type: components["schemas"]["TagRelationType"];
        };
        /** @enum {string} */
        TagRelationType: "Inherit" | "Derive";
        /** @enum {string} */
        TagType: "Descriptor" | "Genre" | "Movement" | "Scene";
        UploadAvatar: {
            /** Format: binary */
            data: Blob;
        };
        UserProfile: {
            name: string;
            /** @description Avatar url with sub directory, eg. ab/cd/abcd..xyz.jpg */
            avatar_url?: string | null;
            /** Format: date-time */
            last_login?: string | null;
            roles: number[];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
};
export type $defs = Record<string, never>;
export interface operations {
    find_artist_by_keyword: {
        parameters: {
            query: {
                keyword: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVecArtist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    create_artist: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArtistCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_artist_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataArtist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    upsert_artist_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArtistCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    upload_avatar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["UploadAvatar"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    handle_correction: {
        parameters: {
            query: {
                method: components["schemas"]["HandleCorrectionMethod"];
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_by_keyword: {
        parameters: {
            query: {
                keyword: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVecEventResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EventCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_EventResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    upsert_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EventCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_label_by_keyword: {
        parameters: {
            query: {
                keyword: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVecLabelResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    create_label: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewLabel"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_label_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataLabelResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    upsert_label_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewLabel"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    language_list: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVecLanguage"];
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    profile_with_name: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_release_by_keyword: {
        parameters: {
            query: {
                keyword: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVecReleaseResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    create_release: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReleaseCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_release_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataReleaseResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    update_release: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReleaseCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    sign_in: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AuthCredential"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    sign_out: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    sign_up: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AuthCredential"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_song_by_keyword: {
        parameters: {
            query: {
                keyword: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVecSongResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    create_song: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewSong"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    find_song_by_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataSongResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    update_song: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewSong"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    create_tag: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TagCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    upsert_tag_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TagCorrection"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
    user_roles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVecLanguage"];
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "Err";
                        message: string;
                        error_code: number;
                    };
                };
            };
        };
    };
}
