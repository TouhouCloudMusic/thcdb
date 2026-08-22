export type paths = {
    "/{entity_type}/{id}/collections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["entity_user_collections"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{entity_type}/{id}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["entity_corrections"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{entity_type}/{id}/pending-correction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["pending_correction"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{entity_type}/{id}/tag-vote": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["vote_tag"];
        post?: never;
        delete: operations["delete_vote"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{entity_type}/{id}/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_tags"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/{target_type}/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_entity_comments"];
        put?: never;
        post: operations["create_entity_comment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/user/{id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["set_user_roles"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_users"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_many_artist"];
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
    "/artist/{id}/appearances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_artist_appearances"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_artist_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist/{id}/credits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_artist_credits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist/{id}/discographies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_artist_discographies_by_type"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist/{id}/discographies/init": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_artist_discographies_init"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist/{id}/profile-image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_artist_profile_image_metadata"];
        put?: never;
        post: operations["upload_artist_profile_image"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artist/explore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["explore_artist"];
        put?: never;
        post?: never;
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
    "/collection": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["create_user_collection"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collection/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["user_collection_detail"];
        put: operations["update_user_collection"];
        post?: never;
        delete: operations["delete_user_collection"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collection/{id}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["user_collection_items"];
        put?: never;
        post: operations["create_user_collection_item"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collection/{id}/items/{item_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["delete_user_collection_item"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collection/{id}/items/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["reorder_user_collection_items"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/public": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["public_user_collections"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/collections/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_user_collections"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/comment/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["delete_comment"];
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
        get: operations["get_correction"];
        put?: never;
        post: operations["moderate_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/correction/{id}/diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_correction_diff"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/correction/{id}/revisions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_correction_revisions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/correction/{id}/subscription": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["set_correction_subscription"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/correction/{id1}/compare/{id2}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["compare_corrections"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/credit-role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["create_credit_role"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/credit-role/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_credit_role_by_id"];
        put?: never;
        post: operations["upsert_credit_role_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/credit-role/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_credit_role_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/credit-role/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_many_credit_roles_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/editable-user-roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["editable_user_roles"];
        put?: never;
        post?: never;
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
        get: operations["find_event_by_keyword"];
        put?: never;
        post: operations["create_event"];
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
        get: operations["find_event_by_id"];
        put?: never;
        post: operations["upsert_event_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/event/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_event_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/event/explore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["explore_event"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["forgot_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health_check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["health_check"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/home/metadata": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["home_metadata"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/image-queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["pending_image_queue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/image-queue/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["image_queue_detail"];
        put?: never;
        post: operations["moderate_image_queue"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/image-queue/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_image_queue_comments"];
        put?: never;
        post: operations["create_image_queue_comment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/image-queue/{id}/subscription": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["set_image_queue_subscription"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/image-queue/pending-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["pending_image_queue_count"];
        put?: never;
        post?: never;
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
    "/label/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_label_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/label/explore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["explore_label"];
        put?: never;
        post?: never;
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
    "/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_notifications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/{notification_id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["mark_read"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/{notification_id}/saved": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["save_notification"];
        post?: never;
        delete: operations["unsave_notification"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/{notification_id}/unread": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["mark_unread"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/read-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["read_all"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["unread_count"];
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
    "/profile-banner": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["upload_profile_banner"];
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
    "/profile/{name}/follow": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["follow_user"];
        delete: operations["unfollow_user"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/profile/bio": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_bio"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/profile/followed-collections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["followed_user_collections"];
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
    "/release/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_release_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release/{id}/cover-art": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_release_cover_art_metadata"];
        put?: never;
        post: operations["upload_release_cover_art"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release/explore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["explore_release"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/resend-verification-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["resend_verification_email"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["reset_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_all"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/artist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_artist"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/event": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_event"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/label": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_label"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_release"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/song": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_song"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/tag": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["search_tag"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sign-in": {
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
    "/sign-out": {
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
    "/sign-up": {
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
    "/song-lyrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_one_song_lyrics"];
        put?: never;
        post: operations["create_song_lyrics"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/song-lyrics/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_song_lyrics_by_id"];
        put?: never;
        post: operations["update_song_lyrics"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/song-lyrics/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_song_lyrics_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/song-lyrics/many": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["find_many_song_lyrics"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/song-relation-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["song_relation_types"];
        put?: never;
        post?: never;
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
    "/song/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_song_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/song/explore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["explore_song"];
        put?: never;
        post?: never;
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
        get: operations["find_tag_by_keyword"];
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
        get: operations["find_tag_by_id"];
        put?: never;
        post: operations["upsert_tag_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tag/{id}/correction/{correction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["update_tag_pending_correction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tag/explore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["explore_tag"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/user-collections/{id}/follow": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["follow_user_collection"];
        delete: operations["unfollow_user_collection"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/user-events/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["stream_user_events"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/user-roles": {
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
    "/user/{id}/image-queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["user_image_queue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/user/{username}/collections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["user_collections"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/verify-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["verify_email"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/verify-reset-code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["verify_reset_code"];
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
        AlternativeName: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        Artist: {
            /** @description List of id of artist aliases */
            aliases?: number[];
            artist_type: components["schemas"]["ArtistType"];
            current_location?: components["schemas"]["Location"];
            end_date?: null | components["schemas"]["DateWithPrecision"];
            /** Format: int32 */
            id: number;
            links?: string[];
            localized_names?: components["schemas"]["LocalizedName"][];
            /** @description Groups list for individuals, member list for groups, */
            memberships?: components["schemas"]["Membership"][];
            name: string;
            /** @description Profile image of artist */
            profile_image_url?: string | null;
            start_date?: null | components["schemas"]["DateWithPrecision"];
            start_location?: components["schemas"]["Location"];
            /** @description Aliases without own page */
            text_aliases?: string[] | null;
        };
        ArtistCommonFilter: {
            artist_type?: components["schemas"]["ArtistType"][];
            exclusion?: number[];
        };
        ArtistImageQueueTarget: {
            /** Format: int32 */
            artist_id: number;
            type: components["schemas"]["ArtistImageType"];
        };
        /** @enum {string} */
        ArtistImageType: "Profile";
        ArtistProfileImageFormData: {
            /** Format: binary */
            data: string;
        };
        ArtistReleaseArtist: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        ArtistSummary: {
            artist_type: components["schemas"]["ArtistType"];
            /** Format: int32 */
            id: number;
            name: string;
            profile_image_url?: string | null;
        };
        /** @enum {string} */
        ArtistType: "Solo" | "Multiple" | "Unknown";
        AuthCredential: {
            password: string;
            username: string;
        };
        CatalogNumber: {
            catalog_number: string;
            label?: null | components["schemas"]["SimpleLabel"];
        };
        CollectionReference: {
            /** Format: int32 */
            id: number;
            /** @enum {string} */
            state: "Available";
            title: string;
        } | {
            /** @enum {string} */
            state: "Deleted";
        } | {
            /** @enum {string} */
            state: "Restricted";
        };
        Comment: {
            author: components["schemas"]["CommentAuthor"];
            content?: string | null;
            /** Format: date-time */
            created_at: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            in_reply_to_comment_id?: number | null;
            state: components["schemas"]["CommentState"];
            /** Format: date-time */
            updated_at: string;
        };
        CommentAuthor: {
            avatar_url?: string | null;
            /** Format: int32 */
            id: number;
            name: string;
        };
        CommentPage: {
            /** Format: int64 */
            active_count: number;
            items: components["schemas"]["Comment"][];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CommentPreview: {
            actor: components["schemas"]["UserSummary"];
            content: string;
            /** Format: date-time */
            created_at: string;
            /** Format: int32 */
            id: number;
            /** @enum {string} */
            state: "Visible";
        } | {
            actor: components["schemas"]["UserSummary"];
            /** Format: date-time */
            created_at: string;
            /** @enum {string} */
            state: "Deleted";
        };
        /** @enum {string} */
        CommentState: "Active" | "Deleted";
        /** @enum {string} */
        CorrectionDecision: "Approve" | "Reject";
        CorrectionDetail: {
            author: components["schemas"]["UserSummary"];
            comments: components["schemas"]["CommentPage"];
            /** Format: date-time */
            created_at: string;
            /** Format: int32 */
            entity_id: number;
            entity_name: string;
            entity_type: components["schemas"]["EntityType"];
            /** Format: date-time */
            handled_at?: string | null;
            /** Format: int32 */
            id: number;
            /** @description Whether the querist subscribes to this correction. `None` if querist is not signed in. */
            is_subscribed?: boolean | null;
            status: components["schemas"]["CorrectionStatus"];
            type: components["schemas"]["CorrectionType"];
        };
        CorrectionDiff: {
            /** Format: int32 */
            base_correction_id?: number | null;
            /** Format: int32 */
            base_history_id?: number | null;
            changes: components["schemas"]["CorrectionDiffEntry"][];
            /** Format: int32 */
            entity_id: number;
            entity_type: components["schemas"]["EntityType"];
            /** Format: int32 */
            target_correction_id: number;
            /** Format: int32 */
            target_history_id: number;
        };
        CorrectionDiffEntry: {
            after?: string | null;
            before?: string | null;
            path: string;
        };
        CorrectionHistoryItem: {
            author: components["schemas"]["UserSummary"];
            /** Format: date-time */
            created_at: string;
            description: string;
            /** Format: date-time */
            handled_at?: string | null;
            /** Format: int32 */
            id: number;
            type: components["schemas"]["CorrectionType"];
        };
        /** @enum {string} */
        CorrectionModerationAction: "Approved" | "Rejected";
        CorrectionRevisionSummary: {
            author: components["schemas"]["UserSummary"];
            description: string;
            /** Format: int32 */
            entity_history_id: number;
        };
        /** @enum {string} */
        CorrectionSortField: "created_at" | "updated_at";
        /** @enum {string} */
        CorrectionStatus: "Pending" | "Approved" | "Rejected";
        /** @enum {string} */
        CorrectionSubmitKind: "Submitted" | "Conflict";
        CorrectionSubmitResult: {
            /** Format: int32 */
            correction_id: number;
            /** Format: int32 */
            entity_id: number;
            kind: components["schemas"]["CorrectionSubmitKind"];
        };
        /** @enum {string} */
        CorrectionType: "Create" | "Update" | "Delete";
        CreateEntityCommentRequest: {
            content: string;
            /** Format: int32 */
            in_reply_to_comment_id?: number | null;
            /** Format: int32 */
            read_through_comment_id?: number | null;
        };
        CreateUserCollectionItemRequest: {
            description?: string | null;
            /** Format: int32 */
            entity_id: number;
            entity_type: components["schemas"]["UserCollectionItemEntityType"];
        };
        CreditRole: {
            description: string;
            /** Format: int32 */
            id: number;
            name: string;
            short_description: string;
        };
        CreditRoleRef: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        CreditRoleSummary: {
            /** Format: int32 */
            id: number;
            name: string;
            short_description: string;
        };
        CurrentImageMetadata: {
            /** Format: date-time */
            uploaded_at: string;
            uploaded_by: components["schemas"]["UserSummary"];
        };
        CursorResponse_Credit: {
            items: {
                artist: components["schemas"]["ArtistReleaseArtist"][];
                cover_url?: string | null;
                release_date?: null | components["schemas"]["DateWithPrecision"];
                /** Format: int32 */
                release_id: number;
                release_type: components["schemas"]["ReleaseType"];
                roles: components["schemas"]["CreditRoleRef"][];
                title: string;
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_Discography: {
            items: {
                artist: components["schemas"]["ArtistReleaseArtist"][];
                cover_url?: string | null;
                release_date?: null | components["schemas"]["DateWithPrecision"];
                /** Format: int32 */
                release_id: number;
                release_type: components["schemas"]["ReleaseType"];
                title: string;
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_PendingImageQueueItem: {
            items: {
                /** Format: date-time */
                created_at: string;
                created_by: components["schemas"]["UserSummary"];
                /** Format: int32 */
                id: number;
                /** Format: int32 */
                image_id?: number | null;
                status: components["schemas"]["ImageQueueStatus"];
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_SimpleArtist: {
            items: {
                /** Format: int32 */
                id: number;
                name: string;
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_SimpleEvent: {
            items: {
                /** Format: int32 */
                id: number;
                name: string;
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_SimpleLabel: {
            items: {
                /** Format: int32 */
                id: number;
                name: string;
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_SimpleRelease: {
            items: {
                cover_art_url?: string | null;
                /** Format: int32 */
                id: number;
                title: string;
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_SongRef: {
            items: {
                /** Format: int32 */
                id: number;
                title: string;
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_TagAggregate: {
            items: {
                /** Format: int64 */
                count: number;
                /** Format: int32 */
                id: number;
                name: string;
                /** Format: double */
                relevance: number;
                short_description: string;
                /** Format: int32 */
                user_vote?: number | null;
                votes?: components["schemas"]["TagAggregateVote"][];
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_TagRef: {
            items: {
                /** Format: int32 */
                id: number;
                name: string;
                type: components["schemas"]["TagType"];
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        CursorResponse_UserImageQueueItem: {
            items: {
                /** Format: date-time */
                created_at: string;
                /** Format: date-time */
                handled_at?: string | null;
                handled_by?: null | components["schemas"]["UserSummary"];
                /** Format: int32 */
                id: number;
                /** Format: int32 */
                image_id?: number | null;
                /** Format: date-time */
                reverted_at?: string | null;
                reverted_by?: null | components["schemas"]["UserSummary"];
                status: components["schemas"]["ImageQueueStatus"];
            }[];
            /** Format: int32 */
            next_cursor?: number | null;
        };
        Data_CorrectionDiff: {
            data: {
                /** Format: int32 */
                base_correction_id?: number | null;
                /** Format: int32 */
                base_history_id?: number | null;
                changes: components["schemas"]["CorrectionDiffEntry"][];
                /** Format: int32 */
                entity_id: number;
                entity_type: components["schemas"]["EntityType"];
                /** Format: int32 */
                target_correction_id: number;
                /** Format: int32 */
                target_history_id: number;
            };
            /** @enum {string} */
            status: "Ok";
        };
        Data_CorrectionSubmitResult: {
            data: {
                /** Format: int32 */
                correction_id: number;
                /** Format: int32 */
                entity_id: number;
                kind: components["schemas"]["CorrectionSubmitKind"];
            };
            /** @enum {string} */
            status: "Ok";
        };
        Data_i32: {
            /** Format: int32 */
            data: number;
            /** @enum {string} */
            status: "Ok";
        };
        Data_Option_CurrentImageMetadata: {
            data: null | {
                /** Format: date-time */
                uploaded_at: string;
                uploaded_by: components["schemas"]["UserSummary"];
            };
            /** @enum {string} */
            status: "Ok";
        };
        Data_Option_i32: {
            data: null | number;
            /** @enum {string} */
            status: "Ok";
        };
        Data_Vec_CorrectionHistoryItem: {
            data: {
                author: components["schemas"]["UserSummary"];
                /** Format: date-time */
                created_at: string;
                description: string;
                /** Format: date-time */
                handled_at?: string | null;
                /** Format: int32 */
                id: number;
                type: components["schemas"]["CorrectionType"];
            }[];
            /** @enum {string} */
            status: "Ok";
        };
        Data_Vec_CorrectionRevisionSummary: {
            data: {
                author: components["schemas"]["UserSummary"];
                description: string;
                /** Format: int32 */
                entity_history_id: number;
            }[];
            /** @enum {string} */
            status: "Ok";
        };
        DataComment: {
            data: components["schemas"]["Comment"];
            status: string;
        };
        DataCommentPage: {
            data: components["schemas"]["CommentPage"];
            status: string;
        };
        DataCorrectionDetail: {
            data: components["schemas"]["CorrectionDetail"];
            status: string;
        };
        DataForgotPasswordResponse: {
            data: components["schemas"]["ForgotPasswordResponse"];
            status: string;
        };
        DataHomeMetadata: {
            data: components["schemas"]["HomeMetadata"];
            status: string;
        };
        DataImageQueueDetail: {
            data: components["schemas"]["ImageQueueDetail"];
            status: string;
        };
        DataInitDiscography: {
            data: components["schemas"]["InitDiscography"];
            status: string;
        };
        DataNotificationPage: {
            data: components["schemas"]["NotificationPage"];
            status: string;
        };
        DataOptionArtist: {
            data: null | components["schemas"]["Artist"];
            status: string;
        };
        DataOptionCreditRole: {
            data: null | components["schemas"]["CreditRole"];
            status: string;
        };
        DataOptionEvent: {
            data: null | components["schemas"]["Event"];
            status: string;
        };
        DataOptionLabel: {
            data: null | components["schemas"]["Label"];
            status: string;
        };
        DataOptionRelease: {
            data: null | components["schemas"]["Release"];
            status: string;
        };
        DataOptionSong: {
            data: null | components["schemas"]["Song"];
            status: string;
        };
        DataOptionSongLyrics: {
            data: null | components["schemas"]["SongLyrics"];
            status: string;
        };
        DataOptionTag: {
            data: null | components["schemas"]["Tag"];
            status: string;
        };
        DataPageArtist: {
            data: components["schemas"]["PageResponse_Artist"];
            status: string;
        };
        DataPageEvent: {
            data: components["schemas"]["PageResponse_Event"];
            status: string;
        };
        DataPageFollowedUserCollection: {
            data: components["schemas"]["PageResponse_FollowedUserCollection"];
            status: string;
        };
        DataPageLabel: {
            data: components["schemas"]["PageResponse_Label"];
            status: string;
        };
        DataPageRelease: {
            data: components["schemas"]["PageResponse_Release"];
            status: string;
        };
        DataPageSong: {
            data: components["schemas"]["PageResponse_Song"];
            status: string;
        };
        DataPageTag: {
            data: components["schemas"]["PageResponse_Tag"];
            status: string;
        };
        DataPageUserCollection: {
            data: components["schemas"]["PageResponse_UserCollection"];
            status: string;
        };
        DataPageUserCollectionItemDetail: {
            data: components["schemas"]["PageResponse_UserCollectionItemDetail"];
            status: string;
        };
        DataPageUserSummary: {
            data: components["schemas"]["PageResponse_UserSummary"];
            status: string;
        };
        DataPaginatedAppearance: {
            data: components["schemas"]["CursorResponse_Discography"];
            status: string;
        };
        DataPaginatedCredit: {
            data: components["schemas"]["CursorResponse_Credit"];
            status: string;
        };
        DataPaginatedDiscography: {
            data: components["schemas"]["CursorResponse_Discography"];
            status: string;
        };
        DataPaginatedPendingImageQueueItem: {
            data: components["schemas"]["CursorResponse_PendingImageQueueItem"];
            status: string;
        };
        DataPaginatedSimpleArtist: {
            data: components["schemas"]["CursorResponse_SimpleArtist"];
            status: string;
        };
        DataPaginatedSimpleEvent: {
            data: components["schemas"]["CursorResponse_SimpleEvent"];
            status: string;
        };
        DataPaginatedSimpleLabel: {
            data: components["schemas"]["CursorResponse_SimpleLabel"];
            status: string;
        };
        DataPaginatedSimpleRelease: {
            data: components["schemas"]["CursorResponse_SimpleRelease"];
            status: string;
        };
        DataPaginatedSongRef: {
            data: components["schemas"]["CursorResponse_SongRef"];
            status: string;
        };
        DataPaginatedTagAggregate: {
            data: components["schemas"]["CursorResponse_TagAggregate"];
            status: string;
        };
        DataPaginatedTagRef: {
            data: components["schemas"]["CursorResponse_TagRef"];
            status: string;
        };
        DataPaginatedUserImageQueueItem: {
            data: components["schemas"]["CursorResponse_UserImageQueueItem"];
            status: string;
        };
        DataPendingImageQueueCount: {
            /** Format: int64 */
            data: number;
            status: string;
        };
        DataResendVerificationEmailResponse: {
            data: components["schemas"]["ResendVerificationEmailResponse"];
            status: string;
        };
        DataSearchResponse: {
            data: components["schemas"]["SearchResponse"];
            status: string;
        };
        DataSignUpResponse: {
            data: components["schemas"]["SignUpResponse"];
            status: string;
        };
        DataSubscriptionStatus: {
            data: components["schemas"]["SubscriptionStatus"];
            status: string;
        };
        DataUnreadCount: {
            data: components["schemas"]["UnreadCount"];
            status: string;
        };
        DataUserCollection: {
            data: components["schemas"]["UserCollection"];
            status: string;
        };
        DataUserCollectionItem: {
            data: components["schemas"]["UserCollectionItem"];
            status: string;
        };
        DataUserProfile: {
            data: components["schemas"]["UserProfile"];
            status: string;
        };
        DataUserRoles: {
            data: components["schemas"]["UserRole"][];
            status: string;
        };
        DataVecArtist: {
            data: components["schemas"]["Artist"][];
            status: string;
        };
        DataVecCreditRoleSummary: {
            data: components["schemas"]["CreditRoleSummary"][];
            status: string;
        };
        DataVecEditableUserRole: {
            data: components["schemas"]["EditableUserRole"][];
            status: string;
        };
        DataVecEvent: {
            data: components["schemas"]["Event"][];
            status: string;
        };
        DataVecLabel: {
            data: components["schemas"]["Label"][];
            status: string;
        };
        DataVecLanguage: {
            data: components["schemas"]["Language"][];
            status: string;
        };
        DataVecRelease: {
            data: components["schemas"]["Release"][];
            status: string;
        };
        DataVecSong: {
            data: components["schemas"]["Song"][];
            status: string;
        };
        DataVecSongLyrics: {
            data: components["schemas"]["SongLyrics"][];
            status: string;
        };
        DataVecSongRelationType: {
            data: components["schemas"]["SongRelationType"][];
            status: string;
        };
        DataVecTag: {
            data: components["schemas"]["Tag"][];
            status: string;
        };
        DataVecUserRole: {
            data: components["schemas"]["UserRoleEnum"][];
            status: string;
        };
        DataVerifyResetCodeResponse: {
            data: components["schemas"]["VerifyResetCodeResponse"];
            status: string;
        };
        /** @enum {string} */
        DatePrecision: "Day" | "Month" | "Year";
        DateWithPrecision: {
            precision: components["schemas"]["DatePrecision"];
            /** Format: date */
            value: string;
        };
        DeleteVoteBody: {
            /** Format: int32 */
            tag_id: number;
        };
        /** @enum {string} */
        EditableUserRole: "Moderator";
        /** @enum {string} */
        EntityCommentTarget: "artist" | "release" | "song" | "label" | "event" | "tag" | "correction";
        EntityIdent: string;
        EntityMeta: {
            /** Format: int32 */
            id: number;
            kind: components["schemas"]["NotificationEntityKind"];
            name: string;
        };
        /** @description Discriminated union of entity summaries, tagged by `entity_type`. */
        EntitySummary: (components["schemas"]["ArtistSummary"] & {
            /** @enum {string} */
            entity_type: "Artist";
        }) | (components["schemas"]["ReleaseSummary"] & {
            /** @enum {string} */
            entity_type: "Release";
        }) | (components["schemas"]["SongSummary"] & {
            /** @enum {string} */
            entity_type: "Song";
        }) | (components["schemas"]["TagSummary"] & {
            /** @enum {string} */
            entity_type: "Tag";
        }) | (components["schemas"]["EventSummary"] & {
            /** @enum {string} */
            entity_type: "Event";
        }) | (components["schemas"]["LabelSummary"] & {
            /** @enum {string} */
            entity_type: "Label";
        });
        /** @enum {string} */
        EntityType: "Artist" | "Label" | "Release" | "Song" | "Tag" | "Event" | "SongLyrics" | "CreditRole";
        /** @enum {string} */
        EntityUserCollectionSort: "collected_at" | "follower_count";
        /** @enum {string} */
        EntityUserCollectionTarget: "artist" | "label" | "release" | "song" | "tag" | "event";
        Error: {
            message: string;
            /** @enum {string} */
            status: "Err";
        };
        Event: {
            alternative_names?: components["schemas"]["AlternativeName"][];
            description?: string;
            end_date?: null | components["schemas"]["DateWithPrecision"];
            /** Format: int32 */
            id: number;
            location?: components["schemas"]["Location"];
            name: string;
            short_description?: string;
            start_date?: null | components["schemas"]["DateWithPrecision"];
        };
        EventSummary: {
            /** Format: int32 */
            id: number;
            name: string;
            start_date?: null | components["schemas"]["DateWithPrecision"];
        };
        ForgotPasswordRequest: {
            email: string;
        };
        ForgotPasswordResponse: {
            /** Format: int64 */
            resend_cooldown_seconds: number;
            /** Format: int64 */
            verification_code_expires_minutes: number;
        };
        HomeMetadata: {
            /** Format: int64 */
            artists_count: number;
            /** Format: int64 */
            releases_count: number;
            /** Format: int64 */
            songs_count: number;
            /** Format: int64 */
            tags_count: number;
        };
        /** @enum {string} */
        ImageQueueAction: "Approve" | "Reject" | "Revert";
        ImageQueueDetail: {
            artist?: null | components["schemas"]["ArtistImageQueueTarget"];
            /** Format: date-time */
            created_at: string;
            created_by: components["schemas"]["UserSummary"];
            /** Format: date-time */
            handled_at?: string | null;
            handled_by?: null | components["schemas"]["UserSummary"];
            /** Format: int32 */
            id: number;
            image?: null | components["schemas"]["ImageSummary"];
            /** Format: int32 */
            image_id?: number | null;
            is_subscribed: boolean;
            release?: null | components["schemas"]["ReleaseImageQueueTarget"];
            /** Format: date-time */
            reverted_at?: string | null;
            reverted_by?: null | components["schemas"]["UserSummary"];
            status: components["schemas"]["ImageQueueStatus"];
        };
        /** @enum {string} */
        ImageQueueModerationAction: "Approved" | "Rejected" | "Reverted";
        /** @enum {string} */
        ImageQueueStatus: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Reverted";
        /** @enum {string} */
        ImageQueueType: "artist" | "release";
        ImageSummary: {
            directory: string;
            filename: string;
            /** Format: int32 */
            id: number;
            /** Format: date-time */
            uploaded_at: string;
            uploaded_by: components["schemas"]["UserSummary"];
        };
        InitDiscography: {
            album: components["schemas"]["CursorResponse_Discography"];
            compilation: components["schemas"]["CursorResponse_Discography"];
            demo: components["schemas"]["CursorResponse_Discography"];
            ep: components["schemas"]["CursorResponse_Discography"];
            other: components["schemas"]["CursorResponse_Discography"];
            single: components["schemas"]["CursorResponse_Discography"];
        };
        Label: {
            dissolved_date?: null | components["schemas"]["DateWithPrecision"];
            founded_date?: null | components["schemas"]["DateWithPrecision"];
            founders: number[];
            /** Format: int32 */
            id: number;
            localized_names: components["schemas"]["LocalizedName"][];
            name: string;
        };
        LabelSummary: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        Language: {
            code: string;
            /** Format: int32 */
            id: number;
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
        Location: {
            city?: string | null;
            country?: string | null;
            province?: string | null;
        };
        MarkReadRequest: {
            through_seq: string;
        };
        MarkUnreadRequest: {
            from_seq: string;
        };
        Membership: {
            /** Format: int32 */
            artist_id: number;
            roles?: components["schemas"]["CreditRoleRef"][];
            tenure?: components["schemas"]["Tenure"][];
        };
        Message: {
            message: string;
            /** @enum {string} */
            status: "Ok";
        };
        NewArtist: {
            /** @description List of id of artist aliases */
            aliases?: number[] | null;
            artist_type: components["schemas"]["ArtistType"];
            current_location?: null | components["schemas"]["Location"];
            end_date?: null | components["schemas"]["DateWithPrecision"];
            links?: string[] | null;
            localized_names?: components["schemas"]["NewLocalizedName"][] | null;
            /** @description Groups list for individuals, member list for groups, */
            memberships?: components["schemas"]["NewMembership"][] | null;
            name: components["schemas"]["EntityIdent"];
            start_date?: null | components["schemas"]["DateWithPrecision"];
            start_location?: null | components["schemas"]["Location"];
            /** @description Aliases without own page */
            text_aliases?: components["schemas"]["EntityIdent"][] | null;
        };
        NewCatalogNumber: {
            catalog_number: string;
            /** Format: int32 */
            label_id?: number | null;
        };
        NewCorrection_NewArtist: {
            data: {
                /** @description List of id of artist aliases */
                aliases?: number[] | null;
                artist_type: components["schemas"]["ArtistType"];
                current_location?: null | components["schemas"]["Location"];
                end_date?: null | components["schemas"]["DateWithPrecision"];
                links?: string[] | null;
                localized_names?: components["schemas"]["NewLocalizedName"][] | null;
                /** @description Groups list for individuals, member list for groups, */
                memberships?: components["schemas"]["NewMembership"][] | null;
                name: components["schemas"]["EntityIdent"];
                start_date?: null | components["schemas"]["DateWithPrecision"];
                start_location?: null | components["schemas"]["Location"];
                /** @description Aliases without own page */
                text_aliases?: components["schemas"]["EntityIdent"][] | null;
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCorrection_NewCreditRole: {
            data: {
                description?: string | null;
                name: components["schemas"]["EntityIdent"];
                short_description?: string | null;
                super_roles?: number[] | null;
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCorrection_NewEvent: {
            data: {
                alternative_names?: string[] | null;
                description?: string | null;
                end_date?: null | components["schemas"]["DateWithPrecision"];
                location?: null | components["schemas"]["Location"];
                name: components["schemas"]["EntityIdent"];
                short_description?: string | null;
                start_date?: null | components["schemas"]["DateWithPrecision"];
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCorrection_NewLabel: {
            data: {
                dissolved_date?: null | components["schemas"]["DateWithPrecision"];
                founded_date?: null | components["schemas"]["DateWithPrecision"];
                founders?: number[] | null;
                localized_names?: components["schemas"]["NewLocalizedName"][] | null;
                name: components["schemas"]["EntityIdent"];
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCorrection_NewRelease: {
            data: {
                artists: number[];
                catalog_nums: components["schemas"]["NewCatalogNumber"][];
                credits: components["schemas"]["NewCredit"][];
                discs: components["schemas"]["NewDisc"][];
                events: number[];
                localized_titles: components["schemas"]["NewLocalizedTitle"][];
                recording_date_end?: null | components["schemas"]["DateWithPrecision"];
                recording_date_start?: null | components["schemas"]["DateWithPrecision"];
                release_date?: null | components["schemas"]["DateWithPrecision"];
                release_type: components["schemas"]["ReleaseType"];
                title: string;
                tracks: components["schemas"]["NewTrack"][];
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCorrection_NewSong: {
            data: {
                artists?: number[] | null;
                credits?: components["schemas"]["NewSongCredit"][] | null;
                languages?: number[] | null;
                localized_titles?: components["schemas"]["NewLocalizedName"][] | null;
                relations?: components["schemas"]["NewSongRelation"][] | null;
                title: components["schemas"]["EntityIdent"];
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCorrection_NewSongLyrics: {
            data: {
                content: string;
                is_main: boolean;
                /** Format: int32 */
                language_id: number;
                /** Format: int32 */
                song_id: number;
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCorrection_NewTag: {
            data: {
                alt_names?: string[] | null;
                description?: string | null;
                name: components["schemas"]["EntityIdent"];
                relations?: components["schemas"]["NewTagRelation"][] | null;
                short_description?: string | null;
                type: components["schemas"]["TagType"];
            };
            description: string;
            type: components["schemas"]["CorrectionType"];
        };
        NewCredit: {
            /** Format: int32 */
            artist_id: number;
            on?: number[] | null;
            /** Format: int32 */
            role_id: number;
        };
        NewCreditRole: {
            description?: string | null;
            name: components["schemas"]["EntityIdent"];
            short_description?: string | null;
            super_roles?: number[] | null;
        };
        NewDisc: {
            name?: string | null;
        };
        NewEvent: {
            alternative_names?: string[] | null;
            description?: string | null;
            end_date?: null | components["schemas"]["DateWithPrecision"];
            location?: null | components["schemas"]["Location"];
            name: components["schemas"]["EntityIdent"];
            short_description?: string | null;
            start_date?: null | components["schemas"]["DateWithPrecision"];
        };
        NewLabel: {
            dissolved_date?: null | components["schemas"]["DateWithPrecision"];
            founded_date?: null | components["schemas"]["DateWithPrecision"];
            founders?: number[] | null;
            localized_names?: components["schemas"]["NewLocalizedName"][] | null;
            name: components["schemas"]["EntityIdent"];
        };
        NewLocalizedName: {
            /** Format: int32 */
            language_id: number;
            name: string;
        };
        NewLocalizedTitle: {
            /** Format: int32 */
            language_id: number;
            title: string;
        };
        NewMembership: {
            /** Format: int32 */
            artist_id: number;
            roles: number[];
            tenure: components["schemas"]["Tenure"][];
        };
        NewRelease: {
            artists: number[];
            catalog_nums: components["schemas"]["NewCatalogNumber"][];
            credits: components["schemas"]["NewCredit"][];
            discs: components["schemas"]["NewDisc"][];
            events: number[];
            localized_titles: components["schemas"]["NewLocalizedTitle"][];
            recording_date_end?: null | components["schemas"]["DateWithPrecision"];
            recording_date_start?: null | components["schemas"]["DateWithPrecision"];
            release_date?: null | components["schemas"]["DateWithPrecision"];
            release_type: components["schemas"]["ReleaseType"];
            title: string;
            tracks: components["schemas"]["NewTrack"][];
        };
        NewSong: {
            artists?: number[] | null;
            credits?: components["schemas"]["NewSongCredit"][] | null;
            languages?: number[] | null;
            localized_titles?: components["schemas"]["NewLocalizedName"][] | null;
            relations?: components["schemas"]["NewSongRelation"][] | null;
            title: components["schemas"]["EntityIdent"];
        };
        NewSongCredit: {
            /** Format: int32 */
            artist_id: number;
            /** Format: int32 */
            role_id?: number | null;
        };
        NewSongLyrics: {
            content: string;
            is_main: boolean;
            /** Format: int32 */
            language_id: number;
            /** Format: int32 */
            song_id: number;
        };
        NewSongRelation: {
            description: string;
            /** Format: int32 */
            related_song_id: number;
            /** Format: int32 */
            relation_type_id: number;
        };
        NewTag: {
            alt_names?: string[] | null;
            description?: string | null;
            name: components["schemas"]["EntityIdent"];
            relations?: components["schemas"]["NewTagRelation"][] | null;
            short_description?: string | null;
            type: components["schemas"]["TagType"];
        };
        NewTagRelation: {
            /** Format: int32 */
            related_tag_id: number;
            type: components["schemas"]["TagRelationType"];
        };
        NewTrack: {
            artists: number[];
            /** Format: int32 */
            disc_index: number;
            display_title?: string | null;
            /** Format: int32 */
            duration?: number | null;
            /** Format: int32 */
            song_id: number;
            track_number?: string | null;
        };
        NonEmptyString: string;
        NotificationBody: {
            actor: components["schemas"]["UserSummary"];
            correction: components["schemas"]["EntityMeta"];
            /** @enum {string} */
            kind: "CorrectionReviewRequested";
        } | {
            actor: components["schemas"]["UserSummary"];
            correction: components["schemas"]["EntityMeta"];
            /** @enum {string} */
            kind: "CorrectionUpdated";
        } | {
            action: components["schemas"]["CorrectionModerationAction"];
            actor: components["schemas"]["UserSummary"];
            correction: components["schemas"]["EntityMeta"];
            /** @enum {string} */
            kind: "CorrectionModerated";
        } | {
            /** Format: int32 */
            additional_commenter_count: number;
            commenters: [
            ] | [
                components["schemas"]["UserSummary"]
            ] | [
                components["schemas"]["UserSummary"],
                components["schemas"]["UserSummary"]
            ];
            container?: null | components["schemas"]["EntityMeta"];
            /** @enum {string} */
            kind: "CommentThreadUpdated";
            latest: components["schemas"]["CommentPreview"];
        } | {
            container?: null | components["schemas"]["EntityMeta"];
            /** @enum {string} */
            kind: "CommentReplied";
            reply: components["schemas"]["CommentPreview"];
        } | {
            actor: components["schemas"]["UserSummary"];
            /** @enum {string} */
            kind: "UserFollowed";
        } | {
            actor: components["schemas"]["UserSummary"];
            collection: components["schemas"]["CollectionReference"];
            /** @enum {string} */
            kind: "CollectionFollowed";
        } | {
            actor: components["schemas"]["UserSummary"];
            collection: components["schemas"]["CollectionReference"];
            /** @enum {string} */
            kind: "CollectionItemAdded";
        } | {
            action: components["schemas"]["ImageQueueModerationAction"];
            actor: components["schemas"]["UserSummary"];
            image_queue: components["schemas"]["EntityMeta"];
            image_type: components["schemas"]["NotificationImageType"];
            /** @enum {string} */
            kind: "ImageQueueModerated";
        } | {
            actor: components["schemas"]["UserSummary"];
            /** @enum {string} */
            kind: "AccountRoleChanged";
            new_roles: string[];
        };
        /**
         * @description Category for frontend filtering of notifications.
         * @enum {string}
         */
        NotificationCategory: "Correction" | "Comment" | "Social" | "Collection" | "ImageQueue" | "Account";
        NotificationCursor: {
            before_inbox_seq: string;
            snapshot_inbox_seq: string;
        };
        /** @enum {string} */
        NotificationEntityKind: "Artist" | "Release" | "Song" | "Label" | "Event" | "Tag" | "Correction" | "ImageQueue";
        /** @enum {string} */
        NotificationImageType: "Profile" | "Cover";
        NotificationItem: {
            body: components["schemas"]["NotificationBody"];
            /** Format: date-time */
            created_at: string;
            id: string;
            is_unread: boolean;
            /** Format: date-time */
            last_activity_at: string;
            /** Format: date-time */
            saved_at?: string | null;
            through_seq: string;
        };
        NotificationPage: {
            items: components["schemas"]["NotificationItem"][];
            next_cursor?: null | components["schemas"]["NotificationCursor"];
            snapshot_inbox_seq: string;
        };
        /** @enum {string} */
        NotificationState: "inbox" | "unread" | "saved";
        PageResponse_Artist: {
            items: {
                /** @description List of id of artist aliases */
                aliases?: number[];
                artist_type: components["schemas"]["ArtistType"];
                current_location?: components["schemas"]["Location"];
                end_date?: null | components["schemas"]["DateWithPrecision"];
                /** Format: int32 */
                id: number;
                links?: string[];
                localized_names?: components["schemas"]["LocalizedName"][];
                /** @description Groups list for individuals, member list for groups, */
                memberships?: components["schemas"]["Membership"][];
                name: string;
                /** @description Profile image of artist */
                profile_image_url?: string | null;
                start_date?: null | components["schemas"]["DateWithPrecision"];
                start_location?: components["schemas"]["Location"];
                /** @description Aliases without own page */
                text_aliases?: string[] | null;
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_Event: {
            items: {
                alternative_names?: components["schemas"]["AlternativeName"][];
                description?: string;
                end_date?: null | components["schemas"]["DateWithPrecision"];
                /** Format: int32 */
                id: number;
                location?: components["schemas"]["Location"];
                name: string;
                short_description?: string;
                start_date?: null | components["schemas"]["DateWithPrecision"];
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_FollowedUserCollection: {
            items: {
                collection: components["schemas"]["UserCollection"];
                /** Format: date-time */
                followed_at: string;
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_Label: {
            items: {
                dissolved_date?: null | components["schemas"]["DateWithPrecision"];
                founded_date?: null | components["schemas"]["DateWithPrecision"];
                founders: number[];
                /** Format: int32 */
                id: number;
                localized_names: components["schemas"]["LocalizedName"][];
                name: string;
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_Release: {
            items: {
                artists?: components["schemas"]["ReleaseArtist"][];
                catalog_nums?: components["schemas"]["CatalogNumber"][];
                cover_art_url?: string | null;
                credits?: components["schemas"]["ReleaseCredit"][];
                discs?: components["schemas"]["ReleaseDisc"][];
                events?: components["schemas"]["SimpleEvent"][];
                /** Format: int32 */
                id: number;
                localized_titles?: components["schemas"]["LocalizedTitle"][];
                recording_date_end?: null | components["schemas"]["DateWithPrecision"];
                recording_date_start?: null | components["schemas"]["DateWithPrecision"];
                release_date?: null | components["schemas"]["DateWithPrecision"];
                release_type: components["schemas"]["ReleaseType"];
                title: string;
                tracks?: components["schemas"]["ReleaseTrack"][];
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_Song: {
            items: {
                artists?: components["schemas"]["SimpleArtist"][];
                credits?: components["schemas"]["SongCredit"][];
                /** Format: int32 */
                id: number;
                languages?: components["schemas"]["Language"][];
                localized_titles?: components["schemas"]["LocalizedTitle"][];
                lyrics?: components["schemas"]["SongLyrics"][];
                relations?: components["schemas"]["SongRelation"][];
                releases?: components["schemas"]["SongRelease"][];
                title: string;
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_Tag: {
            items: {
                alt_names?: components["schemas"]["AlternativeName"][];
                description: string;
                /** Format: int32 */
                id: number;
                name: string;
                relations?: components["schemas"]["TagRelation"][];
                short_description: string;
                type: components["schemas"]["TagType"];
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_UserCollection: {
            items: {
                description: string;
                /** Format: date-time */
                followed_at?: string | null;
                /** Format: int64 */
                follower_count: number;
                /** Format: int32 */
                id: number;
                is_following?: boolean | null;
                is_public: boolean;
                /** Format: int64 */
                item_count: number;
                name: string;
                owner: components["schemas"]["UserCollectionOwner"];
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_UserCollectionItemDetail: {
            items: {
                description?: string | null;
                entity?: null | components["schemas"]["EntitySummary"];
                /** Format: int32 */
                entity_id?: number | null;
                entity_type: components["schemas"]["EntityType"];
                /** Format: int32 */
                id: number;
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        PageResponse_UserSummary: {
            items: {
                /** Format: int32 */
                id: number;
                name: string;
                roles: components["schemas"]["UserRole"][];
            }[];
            /** Format: int64 */
            page: number;
            /** Format: int32 */
            page_size: number;
            /** Format: int64 */
            total_items: number;
            /** Format: int64 */
            total_pages: number;
        };
        /** @enum {string} */
        Permission: "correction.manage" | "comment.manage" | "image.queue.manage" | "admin.user.read" | "admin.user.role.write";
        ReadAllRequest: {
            snapshot_inbox_seq: string;
        };
        Release: {
            artists?: components["schemas"]["ReleaseArtist"][];
            catalog_nums?: components["schemas"]["CatalogNumber"][];
            cover_art_url?: string | null;
            credits?: components["schemas"]["ReleaseCredit"][];
            discs?: components["schemas"]["ReleaseDisc"][];
            events?: components["schemas"]["SimpleEvent"][];
            /** Format: int32 */
            id: number;
            localized_titles?: components["schemas"]["LocalizedTitle"][];
            recording_date_end?: null | components["schemas"]["DateWithPrecision"];
            recording_date_start?: null | components["schemas"]["DateWithPrecision"];
            release_date?: null | components["schemas"]["DateWithPrecision"];
            release_type: components["schemas"]["ReleaseType"];
            title: string;
            tracks?: components["schemas"]["ReleaseTrack"][];
        };
        ReleaseArtist: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        ReleaseCoverArtFormData: {
            /** Format: binary */
            data: string;
        };
        ReleaseCredit: {
            artist: components["schemas"]["ReleaseArtist"];
            on?: number[] | null;
            role: components["schemas"]["CreditRoleRef"];
        };
        ReleaseDisc: {
            /** Format: int32 */
            id: number;
            name?: string | null;
        };
        ReleaseImageQueueTarget: {
            /** Format: int32 */
            release_id: number;
            type: components["schemas"]["ReleaseImageType"];
        };
        /** @enum {string} */
        ReleaseImageType: "Cover";
        /** @enum {string} */
        ReleaseSortField: "release_date" | "created_at" | "updated_at";
        ReleaseSummary: {
            artists?: components["schemas"]["SimpleArtist"][];
            cover_art_url?: string | null;
            /** Format: int32 */
            id: number;
            release_date?: null | components["schemas"]["DateWithPrecision"];
            release_type: components["schemas"]["ReleaseType"];
            title: string;
        };
        ReleaseTrack: {
            artists?: components["schemas"]["ReleaseArtist"][];
            /** Format: int32 */
            disc_id: number;
            display_title?: string | null;
            /**
             * Format: int32
             * @description Milliseconds of this track
             */
            duration?: number | null;
            /** Format: int32 */
            id: number;
            song: components["schemas"]["SongRef"];
            track_number?: string | null;
        };
        /** @enum {string} */
        ReleaseType: "Album" | "Ep" | "Single" | "Compilation" | "Demo" | "Other";
        ReorderUserCollectionItemsRequest: {
            item_ids: number[];
        };
        ResendVerificationEmailRequest: {
            email: string;
        };
        ResendVerificationEmailResponse: {
            /** Format: int64 */
            resend_cooldown_seconds: number;
            /** Format: int64 */
            verification_code_expires_minutes: number;
        };
        ResetPasswordRequest: {
            password: string;
        };
        /** @enum {string} */
        Score: "Veto" | "Low" | "Medium" | "High";
        SearchResponse: {
            artists: components["schemas"]["CursorResponse_SimpleArtist"];
            events: components["schemas"]["CursorResponse_SimpleEvent"];
            labels: components["schemas"]["CursorResponse_SimpleLabel"];
            releases: components["schemas"]["CursorResponse_SimpleRelease"];
            songs: components["schemas"]["CursorResponse_SongRef"];
            tags: components["schemas"]["CursorResponse_TagRef"];
        };
        SetUserRolesRequest: {
            roles: components["schemas"]["EditableUserRole"][];
        };
        SignUpRequest: {
            email: string;
            password: string;
            username: string;
        };
        SignUpResponse: {
            /** Format: int64 */
            resend_cooldown_seconds: number;
            /** Format: int64 */
            signup_expires_hours: number;
            /** Format: int64 */
            verification_code_expires_minutes: number;
        };
        SimpleArtist: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        SimpleEvent: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        SimpleLabel: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        Song: {
            artists?: components["schemas"]["SimpleArtist"][];
            credits?: components["schemas"]["SongCredit"][];
            /** Format: int32 */
            id: number;
            languages?: components["schemas"]["Language"][];
            localized_titles?: components["schemas"]["LocalizedTitle"][];
            lyrics?: components["schemas"]["SongLyrics"][];
            relations?: components["schemas"]["SongRelation"][];
            releases?: components["schemas"]["SongRelease"][];
            title: string;
        };
        SongCredit: {
            artist: components["schemas"]["SimpleArtist"];
            role?: null | components["schemas"]["CreditRoleRef"];
        };
        SongLyrics: {
            content: string;
            /** Format: int32 */
            id: number;
            is_main: boolean;
            language: components["schemas"]["Language"];
            /** Format: int32 */
            song_id: number;
        };
        SongRef: {
            /** Format: int32 */
            id: number;
            title: string;
        };
        SongRelation: {
            artist?: null | components["schemas"]["SimpleArtist"];
            description: string;
            song: components["schemas"]["SongRef"];
            type: components["schemas"]["SongRelationType"];
        };
        SongRelationType: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        SongRelease: {
            cover_art_url?: string | null;
            /** Format: int32 */
            id: number;
            title: string;
            track_number?: string | null;
        };
        SongSummary: {
            artists?: components["schemas"]["SimpleArtist"][];
            cover_art_url?: string | null;
            /** Format: int32 */
            id: number;
            title: string;
        };
        /** @enum {string} */
        SortDirection: "asc" | "desc";
        SubscriptionStatus: {
            subscribed: boolean;
        };
        Tag: {
            alt_names?: components["schemas"]["AlternativeName"][];
            description: string;
            /** Format: int32 */
            id: number;
            name: string;
            relations?: components["schemas"]["TagRelation"][];
            short_description: string;
            type: components["schemas"]["TagType"];
        };
        TagAggregateVote: {
            /** Format: int32 */
            score: number;
            user_name: string;
        };
        TagRef: {
            /** Format: int32 */
            id: number;
            name: string;
            type: components["schemas"]["TagType"];
        };
        TagRelation: {
            tag: components["schemas"]["TagRef"];
            type: components["schemas"]["TagRelationType"];
        };
        /** @enum {string} */
        TagRelationType: "Inherit" | "Derive";
        TagSummary: {
            /** Format: int32 */
            id: number;
            name: string;
            tag_type: components["schemas"]["TagType"];
        };
        /** @enum {string} */
        TagType: "Descriptor" | "Genre" | "Movement" | "Scene";
        Tenure: {
            /** Format: int32 */
            join_year?: number | null;
            /** Format: int32 */
            leave_year?: number | null;
        };
        UnreadCount: {
            /** Format: int32 */
            count: number;
        };
        UploadAvatar: {
            /** Format: binary */
            data: string;
        };
        UploadProfileBanner: {
            /** Format: binary */
            data: string;
        };
        UserCollection: {
            description: string;
            /** Format: date-time */
            followed_at?: string | null;
            /** Format: int64 */
            follower_count: number;
            /** Format: int32 */
            id: number;
            is_following?: boolean | null;
            is_public: boolean;
            /** Format: int64 */
            item_count: number;
            name: string;
            owner: components["schemas"]["UserCollectionOwner"];
        };
        UserCollectionItem: {
            description?: string | null;
            /** Format: int32 */
            entity_id?: number | null;
            entity_type: components["schemas"]["EntityType"];
            /** Format: int32 */
            id: number;
        };
        /** @enum {string} */
        UserCollectionItemEntityType: "Artist" | "Label" | "Release" | "Song" | "Tag" | "Event";
        UserCollectionMutationRequest: {
            description: string;
            is_public: boolean;
            name: components["schemas"]["NonEmptyString"];
        };
        UserCollectionOwner: {
            avatar_url?: string | null;
            /** Format: int32 */
            id: number;
            name: string;
        };
        UserProfile: {
            /** @description Avatar url with sub directory, eg. ab/cd/abcd..xyz.jpg */
            avatar_url?: string | null;
            /** @description Banner url with sub directory, eg. ab/cd/abcd..xyz.jpg */
            banner_url?: string | null;
            bio?: string | null;
            /** Format: int32 */
            id: number;
            /** @description Whether the querist follows the user. Return `None` if querist is not signed in or it's querist's own profile */
            is_following?: boolean | null;
            /** Format: date-time */
            last_login: string;
            name: string;
            permissions?: components["schemas"]["Permission"][];
            roles?: components["schemas"]["UserRole"][];
            settings?: unknown;
            stats: components["schemas"]["UserProfileStats"];
        };
        UserProfileStats: {
            /** Format: int64 */
            edit_count: number;
            /** Format: int64 */
            vote_count: number;
        };
        UserRole: {
            /** Format: int32 */
            id: number;
            name: components["schemas"]["UserRoleEnum"];
        };
        /** @enum {string} */
        UserRoleEnum: "Admin" | "Moderator" | "User";
        UserSummary: {
            /** Format: int32 */
            id: number;
            name: string;
        };
        VerifyEmailRequest: {
            code: string;
            email: string;
        };
        VerifyResetCodeRequest: {
            code: string;
            email: string;
        };
        VerifyResetCodeResponse: {
            /** Format: date-time */
            key_expires_at: string;
            /** Format: int64 */
            key_expires_minutes: number;
        };
        VoteBody: {
            score: components["schemas"]["Score"];
            /** Format: int32 */
            tag_id: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
};
export type AlternativeName = components['schemas']['AlternativeName'];
export type Artist = components['schemas']['Artist'];
export type ArtistCommonFilter = components['schemas']['ArtistCommonFilter'];
export type ArtistImageQueueTarget = components['schemas']['ArtistImageQueueTarget'];
export type ArtistImageType = components['schemas']['ArtistImageType'];
export type ArtistProfileImageFormData = components['schemas']['ArtistProfileImageFormData'];
export type ArtistReleaseArtist = components['schemas']['ArtistReleaseArtist'];
export type ArtistSummary = components['schemas']['ArtistSummary'];
export type ArtistType = components['schemas']['ArtistType'];
export type AuthCredential = components['schemas']['AuthCredential'];
export type CatalogNumber = components['schemas']['CatalogNumber'];
export type CollectionReference = components['schemas']['CollectionReference'];
export type Comment = components['schemas']['Comment'];
export type CommentAuthor = components['schemas']['CommentAuthor'];
export type CommentPage = components['schemas']['CommentPage'];
export type CommentPreview = components['schemas']['CommentPreview'];
export type CommentState = components['schemas']['CommentState'];
export type CorrectionDecision = components['schemas']['CorrectionDecision'];
export type CorrectionDetail = components['schemas']['CorrectionDetail'];
export type CorrectionDiff = components['schemas']['CorrectionDiff'];
export type CorrectionDiffEntry = components['schemas']['CorrectionDiffEntry'];
export type CorrectionHistoryItem = components['schemas']['CorrectionHistoryItem'];
export type CorrectionModerationAction = components['schemas']['CorrectionModerationAction'];
export type CorrectionRevisionSummary = components['schemas']['CorrectionRevisionSummary'];
export type CorrectionSortField = components['schemas']['CorrectionSortField'];
export type CorrectionStatus = components['schemas']['CorrectionStatus'];
export type CorrectionSubmitKind = components['schemas']['CorrectionSubmitKind'];
export type CorrectionSubmitResult = components['schemas']['CorrectionSubmitResult'];
export type CorrectionType = components['schemas']['CorrectionType'];
export type CreateEntityCommentRequest = components['schemas']['CreateEntityCommentRequest'];
export type CreateUserCollectionItemRequest = components['schemas']['CreateUserCollectionItemRequest'];
export type CreditRole = components['schemas']['CreditRole'];
export type CreditRoleRef = components['schemas']['CreditRoleRef'];
export type CreditRoleSummary = components['schemas']['CreditRoleSummary'];
export type CurrentImageMetadata = components['schemas']['CurrentImageMetadata'];
export type CursorResponseCredit = components['schemas']['CursorResponse_Credit'];
export type CursorResponseDiscography = components['schemas']['CursorResponse_Discography'];
export type CursorResponsePendingImageQueueItem = components['schemas']['CursorResponse_PendingImageQueueItem'];
export type CursorResponseSimpleArtist = components['schemas']['CursorResponse_SimpleArtist'];
export type CursorResponseSimpleEvent = components['schemas']['CursorResponse_SimpleEvent'];
export type CursorResponseSimpleLabel = components['schemas']['CursorResponse_SimpleLabel'];
export type CursorResponseSimpleRelease = components['schemas']['CursorResponse_SimpleRelease'];
export type CursorResponseSongRef = components['schemas']['CursorResponse_SongRef'];
export type CursorResponseTagAggregate = components['schemas']['CursorResponse_TagAggregate'];
export type CursorResponseTagRef = components['schemas']['CursorResponse_TagRef'];
export type CursorResponseUserImageQueueItem = components['schemas']['CursorResponse_UserImageQueueItem'];
export type DataCorrectionDiff = components['schemas']['Data_CorrectionDiff'];
export type DataCorrectionSubmitResult = components['schemas']['Data_CorrectionSubmitResult'];
export type DataI32 = components['schemas']['Data_i32'];
export type DataOptionCurrentImageMetadata = components['schemas']['Data_Option_CurrentImageMetadata'];
export type DataOptionI32 = components['schemas']['Data_Option_i32'];
export type DataVecCorrectionHistoryItem = components['schemas']['Data_Vec_CorrectionHistoryItem'];
export type DataVecCorrectionRevisionSummary = components['schemas']['Data_Vec_CorrectionRevisionSummary'];
export type DataComment = components['schemas']['DataComment'];
export type DataCommentPage = components['schemas']['DataCommentPage'];
export type DataCorrectionDetail = components['schemas']['DataCorrectionDetail'];
export type DataForgotPasswordResponse = components['schemas']['DataForgotPasswordResponse'];
export type DataHomeMetadata = components['schemas']['DataHomeMetadata'];
export type DataImageQueueDetail = components['schemas']['DataImageQueueDetail'];
export type DataInitDiscography = components['schemas']['DataInitDiscography'];
export type DataNotificationPage = components['schemas']['DataNotificationPage'];
export type DataOptionArtist = components['schemas']['DataOptionArtist'];
export type DataOptionCreditRole = components['schemas']['DataOptionCreditRole'];
export type DataOptionEvent = components['schemas']['DataOptionEvent'];
export type DataOptionLabel = components['schemas']['DataOptionLabel'];
export type DataOptionRelease = components['schemas']['DataOptionRelease'];
export type DataOptionSong = components['schemas']['DataOptionSong'];
export type DataOptionSongLyrics = components['schemas']['DataOptionSongLyrics'];
export type DataOptionTag = components['schemas']['DataOptionTag'];
export type DataPageArtist = components['schemas']['DataPageArtist'];
export type DataPageEvent = components['schemas']['DataPageEvent'];
export type DataPageFollowedUserCollection = components['schemas']['DataPageFollowedUserCollection'];
export type DataPageLabel = components['schemas']['DataPageLabel'];
export type DataPageRelease = components['schemas']['DataPageRelease'];
export type DataPageSong = components['schemas']['DataPageSong'];
export type DataPageTag = components['schemas']['DataPageTag'];
export type DataPageUserCollection = components['schemas']['DataPageUserCollection'];
export type DataPageUserCollectionItemDetail = components['schemas']['DataPageUserCollectionItemDetail'];
export type DataPageUserSummary = components['schemas']['DataPageUserSummary'];
export type DataPaginatedAppearance = components['schemas']['DataPaginatedAppearance'];
export type DataPaginatedCredit = components['schemas']['DataPaginatedCredit'];
export type DataPaginatedDiscography = components['schemas']['DataPaginatedDiscography'];
export type DataPaginatedPendingImageQueueItem = components['schemas']['DataPaginatedPendingImageQueueItem'];
export type DataPaginatedSimpleArtist = components['schemas']['DataPaginatedSimpleArtist'];
export type DataPaginatedSimpleEvent = components['schemas']['DataPaginatedSimpleEvent'];
export type DataPaginatedSimpleLabel = components['schemas']['DataPaginatedSimpleLabel'];
export type DataPaginatedSimpleRelease = components['schemas']['DataPaginatedSimpleRelease'];
export type DataPaginatedSongRef = components['schemas']['DataPaginatedSongRef'];
export type DataPaginatedTagAggregate = components['schemas']['DataPaginatedTagAggregate'];
export type DataPaginatedTagRef = components['schemas']['DataPaginatedTagRef'];
export type DataPaginatedUserImageQueueItem = components['schemas']['DataPaginatedUserImageQueueItem'];
export type DataPendingImageQueueCount = components['schemas']['DataPendingImageQueueCount'];
export type DataResendVerificationEmailResponse = components['schemas']['DataResendVerificationEmailResponse'];
export type DataSearchResponse = components['schemas']['DataSearchResponse'];
export type DataSignUpResponse = components['schemas']['DataSignUpResponse'];
export type DataSubscriptionStatus = components['schemas']['DataSubscriptionStatus'];
export type DataUnreadCount = components['schemas']['DataUnreadCount'];
export type DataUserCollection = components['schemas']['DataUserCollection'];
export type DataUserCollectionItem = components['schemas']['DataUserCollectionItem'];
export type DataUserProfile = components['schemas']['DataUserProfile'];
export type DataUserRoles = components['schemas']['DataUserRoles'];
export type DataVecArtist = components['schemas']['DataVecArtist'];
export type DataVecCreditRoleSummary = components['schemas']['DataVecCreditRoleSummary'];
export type DataVecEditableUserRole = components['schemas']['DataVecEditableUserRole'];
export type DataVecEvent = components['schemas']['DataVecEvent'];
export type DataVecLabel = components['schemas']['DataVecLabel'];
export type DataVecLanguage = components['schemas']['DataVecLanguage'];
export type DataVecRelease = components['schemas']['DataVecRelease'];
export type DataVecSong = components['schemas']['DataVecSong'];
export type DataVecSongLyrics = components['schemas']['DataVecSongLyrics'];
export type DataVecSongRelationType = components['schemas']['DataVecSongRelationType'];
export type DataVecTag = components['schemas']['DataVecTag'];
export type DataVecUserRole = components['schemas']['DataVecUserRole'];
export type DataVerifyResetCodeResponse = components['schemas']['DataVerifyResetCodeResponse'];
export type DatePrecision = components['schemas']['DatePrecision'];
export type DateWithPrecision = components['schemas']['DateWithPrecision'];
export type DeleteVoteBody = components['schemas']['DeleteVoteBody'];
export type EditableUserRole = components['schemas']['EditableUserRole'];
export type EntityCommentTarget = components['schemas']['EntityCommentTarget'];
export type EntityIdent = components['schemas']['EntityIdent'];
export type EntityMeta = components['schemas']['EntityMeta'];
export type EntitySummary = components['schemas']['EntitySummary'];
export type EntityType = components['schemas']['EntityType'];
export type EntityUserCollectionSort = components['schemas']['EntityUserCollectionSort'];
export type EntityUserCollectionTarget = components['schemas']['EntityUserCollectionTarget'];
export type Error = components['schemas']['Error'];
export type Event = components['schemas']['Event'];
export type EventSummary = components['schemas']['EventSummary'];
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest'];
export type ForgotPasswordResponse = components['schemas']['ForgotPasswordResponse'];
export type HomeMetadata = components['schemas']['HomeMetadata'];
export type ImageQueueAction = components['schemas']['ImageQueueAction'];
export type ImageQueueDetail = components['schemas']['ImageQueueDetail'];
export type ImageQueueModerationAction = components['schemas']['ImageQueueModerationAction'];
export type ImageQueueStatus = components['schemas']['ImageQueueStatus'];
export type ImageQueueType = components['schemas']['ImageQueueType'];
export type ImageSummary = components['schemas']['ImageSummary'];
export type InitDiscography = components['schemas']['InitDiscography'];
export type Label = components['schemas']['Label'];
export type LabelSummary = components['schemas']['LabelSummary'];
export type Language = components['schemas']['Language'];
export type LocalizedName = components['schemas']['LocalizedName'];
export type LocalizedTitle = components['schemas']['LocalizedTitle'];
export type Location = components['schemas']['Location'];
export type MarkReadRequest = components['schemas']['MarkReadRequest'];
export type MarkUnreadRequest = components['schemas']['MarkUnreadRequest'];
export type Membership = components['schemas']['Membership'];
export type Message = components['schemas']['Message'];
export type NewArtist = components['schemas']['NewArtist'];
export type NewCatalogNumber = components['schemas']['NewCatalogNumber'];
export type NewCorrectionNewArtist = components['schemas']['NewCorrection_NewArtist'];
export type NewCorrectionNewCreditRole = components['schemas']['NewCorrection_NewCreditRole'];
export type NewCorrectionNewEvent = components['schemas']['NewCorrection_NewEvent'];
export type NewCorrectionNewLabel = components['schemas']['NewCorrection_NewLabel'];
export type NewCorrectionNewRelease = components['schemas']['NewCorrection_NewRelease'];
export type NewCorrectionNewSong = components['schemas']['NewCorrection_NewSong'];
export type NewCorrectionNewSongLyrics = components['schemas']['NewCorrection_NewSongLyrics'];
export type NewCorrectionNewTag = components['schemas']['NewCorrection_NewTag'];
export type NewCredit = components['schemas']['NewCredit'];
export type NewCreditRole = components['schemas']['NewCreditRole'];
export type NewDisc = components['schemas']['NewDisc'];
export type NewEvent = components['schemas']['NewEvent'];
export type NewLabel = components['schemas']['NewLabel'];
export type NewLocalizedName = components['schemas']['NewLocalizedName'];
export type NewLocalizedTitle = components['schemas']['NewLocalizedTitle'];
export type NewMembership = components['schemas']['NewMembership'];
export type NewRelease = components['schemas']['NewRelease'];
export type NewSong = components['schemas']['NewSong'];
export type NewSongCredit = components['schemas']['NewSongCredit'];
export type NewSongLyrics = components['schemas']['NewSongLyrics'];
export type NewSongRelation = components['schemas']['NewSongRelation'];
export type NewTag = components['schemas']['NewTag'];
export type NewTagRelation = components['schemas']['NewTagRelation'];
export type NewTrack = components['schemas']['NewTrack'];
export type NonEmptyString = components['schemas']['NonEmptyString'];
export type NotificationBody = components['schemas']['NotificationBody'];
export type NotificationCategory = components['schemas']['NotificationCategory'];
export type NotificationCursor = components['schemas']['NotificationCursor'];
export type NotificationEntityKind = components['schemas']['NotificationEntityKind'];
export type NotificationImageType = components['schemas']['NotificationImageType'];
export type NotificationItem = components['schemas']['NotificationItem'];
export type NotificationPage = components['schemas']['NotificationPage'];
export type NotificationState = components['schemas']['NotificationState'];
export type PageResponseArtist = components['schemas']['PageResponse_Artist'];
export type PageResponseEvent = components['schemas']['PageResponse_Event'];
export type PageResponseFollowedUserCollection = components['schemas']['PageResponse_FollowedUserCollection'];
export type PageResponseLabel = components['schemas']['PageResponse_Label'];
export type PageResponseRelease = components['schemas']['PageResponse_Release'];
export type PageResponseSong = components['schemas']['PageResponse_Song'];
export type PageResponseTag = components['schemas']['PageResponse_Tag'];
export type PageResponseUserCollection = components['schemas']['PageResponse_UserCollection'];
export type PageResponseUserCollectionItemDetail = components['schemas']['PageResponse_UserCollectionItemDetail'];
export type PageResponseUserSummary = components['schemas']['PageResponse_UserSummary'];
export type Permission = components['schemas']['Permission'];
export type ReadAllRequest = components['schemas']['ReadAllRequest'];
export type Release = components['schemas']['Release'];
export type ReleaseArtist = components['schemas']['ReleaseArtist'];
export type ReleaseCoverArtFormData = components['schemas']['ReleaseCoverArtFormData'];
export type ReleaseCredit = components['schemas']['ReleaseCredit'];
export type ReleaseDisc = components['schemas']['ReleaseDisc'];
export type ReleaseImageQueueTarget = components['schemas']['ReleaseImageQueueTarget'];
export type ReleaseImageType = components['schemas']['ReleaseImageType'];
export type ReleaseSortField = components['schemas']['ReleaseSortField'];
export type ReleaseSummary = components['schemas']['ReleaseSummary'];
export type ReleaseTrack = components['schemas']['ReleaseTrack'];
export type ReleaseType = components['schemas']['ReleaseType'];
export type ReorderUserCollectionItemsRequest = components['schemas']['ReorderUserCollectionItemsRequest'];
export type ResendVerificationEmailRequest = components['schemas']['ResendVerificationEmailRequest'];
export type ResendVerificationEmailResponse = components['schemas']['ResendVerificationEmailResponse'];
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];
export type Score = components['schemas']['Score'];
export type SearchResponse = components['schemas']['SearchResponse'];
export type SetUserRolesRequest = components['schemas']['SetUserRolesRequest'];
export type SignUpRequest = components['schemas']['SignUpRequest'];
export type SignUpResponse = components['schemas']['SignUpResponse'];
export type SimpleArtist = components['schemas']['SimpleArtist'];
export type SimpleEvent = components['schemas']['SimpleEvent'];
export type SimpleLabel = components['schemas']['SimpleLabel'];
export type Song = components['schemas']['Song'];
export type SongCredit = components['schemas']['SongCredit'];
export type SongLyrics = components['schemas']['SongLyrics'];
export type SongRef = components['schemas']['SongRef'];
export type SongRelation = components['schemas']['SongRelation'];
export type SongRelationType = components['schemas']['SongRelationType'];
export type SongRelease = components['schemas']['SongRelease'];
export type SongSummary = components['schemas']['SongSummary'];
export type SortDirection = components['schemas']['SortDirection'];
export type SubscriptionStatus = components['schemas']['SubscriptionStatus'];
export type Tag = components['schemas']['Tag'];
export type TagAggregateVote = components['schemas']['TagAggregateVote'];
export type TagRef = components['schemas']['TagRef'];
export type TagRelation = components['schemas']['TagRelation'];
export type TagRelationType = components['schemas']['TagRelationType'];
export type TagSummary = components['schemas']['TagSummary'];
export type TagType = components['schemas']['TagType'];
export type Tenure = components['schemas']['Tenure'];
export type UnreadCount = components['schemas']['UnreadCount'];
export type UploadAvatar = components['schemas']['UploadAvatar'];
export type UploadProfileBanner = components['schemas']['UploadProfileBanner'];
export type UserCollection = components['schemas']['UserCollection'];
export type UserCollectionItem = components['schemas']['UserCollectionItem'];
export type UserCollectionItemEntityType = components['schemas']['UserCollectionItemEntityType'];
export type UserCollectionMutationRequest = components['schemas']['UserCollectionMutationRequest'];
export type UserCollectionOwner = components['schemas']['UserCollectionOwner'];
export type UserProfile = components['schemas']['UserProfile'];
export type UserProfileStats = components['schemas']['UserProfileStats'];
export type UserRole = components['schemas']['UserRole'];
export type UserRoleEnum = components['schemas']['UserRoleEnum'];
export type UserSummary = components['schemas']['UserSummary'];
export type VerifyEmailRequest = components['schemas']['VerifyEmailRequest'];
export type VerifyResetCodeRequest = components['schemas']['VerifyResetCodeRequest'];
export type VerifyResetCodeResponse = components['schemas']['VerifyResetCodeResponse'];
export type VoteBody = components['schemas']['VoteBody'];
export type $defs = Record<string, never>;
export interface operations {
    entity_user_collections: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                sort_by?: components["schemas"]["EntityUserCollectionSort"];
            };
            header?: never;
            path: {
                /** @description Entity type */
                entity_type: components["schemas"]["EntityUserCollectionTarget"];
                /** @description Entity id */
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
                    "application/json": components["schemas"]["DataPageUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    entity_corrections: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                entity_type: "artist" | "label" | "release" | "song" | "tag" | "event" | "song-lyrics" | "credit-role";
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
                    "application/json": components["schemas"]["Data_Vec_CorrectionHistoryItem"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                entity_type: "artist" | "label" | "release" | "song" | "tag" | "event" | "song-lyrics" | "credit-role";
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
                    "application/json": components["schemas"]["Data_Option_i32"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    vote_tag: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                entity_type: "artist" | "release" | "song";
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VoteBody"];
            };
        };
        responses: {
            /** @description Vote recorded */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Entity or tag not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    delete_vote: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                entity_type: "artist" | "release" | "song";
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteVoteBody"];
            };
        };
        responses: {
            /** @description Vote deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    get_tags: {
        parameters: {
            query?: {
                cursor?: number;
                limit?: number;
            };
            header?: never;
            path: {
                entity_type: "artist" | "release" | "song";
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
                    "application/json": components["schemas"]["DataPaginatedTagAggregate"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_entity_comments: {
        parameters: {
            query?: {
                cursor?: number;
                limit?: number;
            };
            header?: never;
            path: {
                /** @description Target id */
                id: number;
                /** @description Comment target type */
                target_type: components["schemas"]["EntityCommentTarget"];
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
                    "application/json": components["schemas"]["DataCommentPage"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    create_entity_comment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Target id */
                id: number;
                /** @description Comment target type */
                target_type: components["schemas"]["EntityCommentTarget"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateEntityCommentRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataComment"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    set_user_roles: {
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
                "application/json": components["schemas"]["SetUserRolesRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserRoles"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    admin_users: {
        parameters: {
            query?: {
                keyword?: string | null;
                limit?: number;
                page?: number;
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
                    "application/json": components["schemas"]["DataPageUserSummary"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_many_artist: {
        parameters: {
            query: {
                artist_type?: components["schemas"]["ArtistType"][];
                exclusion?: number[];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewArtist"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_artist_by_id: {
        parameters: {
            query?: {
                artist_type?: components["schemas"]["ArtistType"][];
                exclusion?: number[];
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
                    "application/json": components["schemas"]["DataOptionArtist"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewArtist"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_artist_appearances: {
        parameters: {
            query: {
                cursor: number;
                limit: number;
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
                    "application/json": components["schemas"]["DataPaginatedAppearance"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_artist_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Artist id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewArtist"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    get_artist_credits: {
        parameters: {
            query: {
                cursor: number;
                limit: number;
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
                    "application/json": components["schemas"]["DataPaginatedCredit"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_artist_discographies_by_type: {
        parameters: {
            query: {
                cursor: number;
                limit: number;
                release_type: components["schemas"]["ReleaseType"];
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
                    "application/json": components["schemas"]["DataPaginatedDiscography"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_artist_discographies_init: {
        parameters: {
            query: {
                limit: number;
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
                    "application/json": components["schemas"]["DataInitDiscography"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    get_artist_profile_image_metadata: {
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
                    "application/json": components["schemas"]["Data_Option_CurrentImageMetadata"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    upload_artist_profile_image: {
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
                "multipart/form-data": components["schemas"]["ArtistProfileImageFormData"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_i32"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    explore_artist: {
        parameters: {
            query?: {
                artist_type?: components["schemas"]["ArtistType"][] | null;
                limit?: number;
                page?: number;
                sort_direction?: null | components["schemas"]["SortDirection"];
                sort_field?: null | components["schemas"]["CorrectionSortField"];
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
                    "application/json": components["schemas"]["DataPageArtist"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    create_user_collection: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserCollectionMutationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    user_collection_detail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
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
                    "application/json": components["schemas"]["DataUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_user_collection: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserCollectionMutationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    delete_user_collection: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    user_collection_items: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                /** @description Collection id */
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
                    "application/json": components["schemas"]["DataPageUserCollectionItemDetail"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    create_user_collection_item: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateUserCollectionItemRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataUserCollectionItem"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    delete_user_collection_item: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
                id: number;
                /** @description Collection item id */
                item_id: number;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    reorder_user_collection_items: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReorderUserCollectionItemsRequest"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    public_user_collections: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
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
                    "application/json": components["schemas"]["DataPageUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_user_collections: {
        parameters: {
            query: {
                keyword: components["schemas"]["NonEmptyString"];
                limit?: number;
                page?: number;
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
                    "application/json": components["schemas"]["DataPageUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    delete_comment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Comment id */
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    get_correction: {
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
                    "application/json": components["schemas"]["DataCorrectionDetail"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    moderate_correction: {
        parameters: {
            query: {
                decision: components["schemas"]["CorrectionDecision"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    get_correction_diff: {
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
                    "application/json": components["schemas"]["Data_CorrectionDiff"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    get_correction_revisions: {
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
                    "application/json": components["schemas"]["Data_Vec_CorrectionRevisionSummary"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    set_correction_subscription: {
        parameters: {
            query: {
                subscribed: boolean;
            };
            header?: never;
            path: {
                /** @description Correction id */
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
                    "application/json": components["schemas"]["DataSubscriptionStatus"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    compare_corrections: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id1: number;
                id2: number;
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
                    "application/json": components["schemas"]["Data_CorrectionDiff"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    create_credit_role: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewCreditRole"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_credit_role_by_id: {
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
                    "application/json": components["schemas"]["DataOptionCreditRole"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    upsert_credit_role_correction: {
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
                "application/json": components["schemas"]["NewCorrection_NewCreditRole"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_credit_role_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Credit role id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewCreditRole"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_many_credit_roles_summary: {
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
                    "application/json": components["schemas"]["DataVecCreditRoleSummary"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    editable_user_roles: {
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
                    "application/json": components["schemas"]["DataVecEditableUserRole"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_event_by_keyword: {
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
                    "application/json": components["schemas"]["DataVecEvent"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    create_event: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewEvent"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_event_by_id: {
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
                    "application/json": components["schemas"]["DataOptionEvent"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    upsert_event_correction: {
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
                "application/json": components["schemas"]["NewCorrection_NewEvent"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_event_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Event id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewEvent"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    explore_event: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                sort_direction?: null | components["schemas"]["SortDirection"];
                sort_field?: null | components["schemas"]["CorrectionSortField"];
                start_date_from?: string | null;
                start_date_to?: string | null;
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
                    "application/json": components["schemas"]["DataPageEvent"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    forgot_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ForgotPasswordRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataForgotPasswordResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    health_check: {
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
                content?: never;
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    home_metadata: {
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
                    "application/json": components["schemas"]["DataHomeMetadata"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    pending_image_queue: {
        parameters: {
            query?: {
                cursor?: number;
                limit?: number;
                status?: null | components["schemas"]["ImageQueueStatus"];
                type?: null | components["schemas"]["ImageQueueType"];
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
                    "application/json": components["schemas"]["DataPaginatedPendingImageQueueItem"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    image_queue_detail: {
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
                    "application/json": components["schemas"]["DataImageQueueDetail"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    moderate_image_queue: {
        parameters: {
            query: {
                action: components["schemas"]["ImageQueueAction"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_image_queue_comments: {
        parameters: {
            query?: {
                cursor?: number;
                limit?: number;
            };
            header?: never;
            path: {
                /** @description Image queue id */
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
                    "application/json": components["schemas"]["DataCommentPage"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    create_image_queue_comment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Image queue id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateEntityCommentRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataComment"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    set_image_queue_subscription: {
        parameters: {
            query: {
                subscribed: boolean;
            };
            header?: never;
            path: {
                /** @description Image queue id */
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
                    "application/json": components["schemas"]["DataSubscriptionStatus"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    pending_image_queue_count: {
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
                    "application/json": components["schemas"]["DataPendingImageQueueCount"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                    "application/json": components["schemas"]["DataVecLabel"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewLabel"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                    "application/json": components["schemas"]["DataOptionLabel"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewLabel"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_label_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Label id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewLabel"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    explore_label: {
        parameters: {
            query?: {
                founded_date_from?: string | null;
                founded_date_to?: string | null;
                is_dissolved?: boolean | null;
                limit?: number;
                page?: number;
                sort_direction?: null | components["schemas"]["SortDirection"];
                sort_field?: null | components["schemas"]["CorrectionSortField"];
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
                    "application/json": components["schemas"]["DataPageLabel"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    list_notifications: {
        parameters: {
            query?: {
                category?: components["schemas"]["NotificationCategory"];
                cursor_before_inbox_seq?: string;
                cursor_snapshot_inbox_seq?: string;
                limit?: number;
                state?: components["schemas"]["NotificationState"];
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
                    "application/json": components["schemas"]["DataNotificationPage"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    mark_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Notification id */
                notification_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MarkReadRequest"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    save_notification: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Notification id */
                notification_id: string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    unsave_notification: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Notification id */
                notification_id: string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    mark_unread: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Notification id */
                notification_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MarkUnreadRequest"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    read_all: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReadAllRequest"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    unread_count: {
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
                    "application/json": components["schemas"]["DataUnreadCount"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    upload_profile_banner: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["UploadProfileBanner"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    follow_user: {
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
                    "application/json": components["schemas"]["Message"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    unfollow_user: {
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
                    "application/json": components["schemas"]["Message"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_bio: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "text/plain": string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    followed_user_collections: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
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
                    "application/json": components["schemas"]["DataPageFollowedUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                    "application/json": components["schemas"]["DataVecRelease"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewRelease"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                    "application/json": components["schemas"]["DataOptionRelease"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewRelease"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_release_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Release id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewRelease"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    get_release_cover_art_metadata: {
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
                    "application/json": components["schemas"]["Data_Option_CurrentImageMetadata"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    upload_release_cover_art: {
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
                "multipart/form-data": components["schemas"]["ReleaseCoverArtFormData"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_i32"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    explore_release: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                release_type?: components["schemas"]["ReleaseType"][] | null;
                sort_direction?: null | components["schemas"]["SortDirection"];
                sort_field?: null | components["schemas"]["ReleaseSortField"];
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
                    "application/json": components["schemas"]["DataPageRelease"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    resend_verification_email: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResendVerificationEmailRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataResendVerificationEmailResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    reset_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResetPasswordRequest"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_all: {
        parameters: {
            query: {
                limit?: number | null;
                search_term: string;
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
                    "application/json": components["schemas"]["DataSearchResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_artist: {
        parameters: {
            query: {
                /** @description Cursor is an offset for stable pagination in relevance ordering. */
                cursor?: number | null;
                limit?: number | null;
                search_term: string;
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
                    "application/json": components["schemas"]["DataPaginatedSimpleArtist"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_event: {
        parameters: {
            query: {
                /** @description Cursor is an offset for stable pagination in relevance ordering. */
                cursor?: number | null;
                limit?: number | null;
                search_term: string;
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
                    "application/json": components["schemas"]["DataPaginatedSimpleEvent"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_label: {
        parameters: {
            query: {
                /** @description Cursor is an offset for stable pagination in relevance ordering. */
                cursor?: number | null;
                limit?: number | null;
                search_term: string;
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
                    "application/json": components["schemas"]["DataPaginatedSimpleLabel"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_release: {
        parameters: {
            query: {
                /** @description Cursor is an offset for stable pagination in relevance ordering. */
                cursor?: number | null;
                limit?: number | null;
                search_term: string;
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
                    "application/json": components["schemas"]["DataPaginatedSimpleRelease"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_song: {
        parameters: {
            query: {
                /** @description Cursor is an offset for stable pagination in relevance ordering. */
                cursor?: number | null;
                limit?: number | null;
                search_term: string;
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
                    "application/json": components["schemas"]["DataPaginatedSongRef"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    search_tag: {
        parameters: {
            query: {
                /** @description Cursor is an offset for stable pagination in relevance ordering. */
                cursor?: number | null;
                limit?: number | null;
                search_term: string;
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
                    "application/json": components["schemas"]["DataPaginatedTagRef"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["SignUpRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataSignUpResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                    "application/json": components["schemas"]["DataVecSong"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewSong"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_one_song_lyrics: {
        parameters: {
            query: {
                language_id: number;
                song_id: number;
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
                    "application/json": components["schemas"]["DataOptionSongLyrics"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    create_song_lyrics: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewSongLyrics"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_song_lyrics_by_id: {
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
                    "application/json": components["schemas"]["DataOptionSongLyrics"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_song_lyrics: {
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
                "application/json": components["schemas"]["NewCorrection_NewSongLyrics"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_song_lyrics_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Song lyrics id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewSongLyrics"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_many_song_lyrics: {
        parameters: {
            query: {
                song_id: number;
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
                    "application/json": components["schemas"]["DataVecSongLyrics"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    song_relation_types: {
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
                    "application/json": components["schemas"]["DataVecSongRelationType"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                    "application/json": components["schemas"]["DataOptionSong"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewSong"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_song_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Song id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewSong"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    explore_song: {
        parameters: {
            query?: {
                language_id?: number[] | null;
                limit?: number;
                page?: number;
                sort_direction?: null | components["schemas"]["SortDirection"];
                sort_field?: null | components["schemas"]["CorrectionSortField"];
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
                    "application/json": components["schemas"]["DataPageSong"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_tag_by_keyword: {
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
                    "application/json": components["schemas"]["DataVecTag"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewTag"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    find_tag_by_id: {
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
                    "application/json": components["schemas"]["DataOptionTag"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                "application/json": components["schemas"]["NewCorrection_NewTag"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    update_tag_pending_correction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Pending correction id */
                correction_id: number;
                /** @description Tag id */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewCorrection_NewTag"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Data_CorrectionSubmitResult"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    explore_tag: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                sort_direction?: null | components["schemas"]["SortDirection"];
                sort_field?: null | components["schemas"]["CorrectionSortField"];
                tag_type?: components["schemas"]["TagType"][] | null;
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
                    "application/json": components["schemas"]["DataPageTag"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    follow_user_collection: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    unfollow_user_collection: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Collection id */
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    stream_user_events: {
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
                    "text/event-stream": string;
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
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
                    "application/json": components["schemas"]["DataVecUserRole"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    user_image_queue: {
        parameters: {
            query?: {
                cursor?: number;
                limit?: number;
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
                    "application/json": components["schemas"]["DataPaginatedUserImageQueueItem"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    user_collections: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                /** @description Username */
                username: components["schemas"]["NonEmptyString"];
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
                    "application/json": components["schemas"]["DataPageUserCollection"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    verify_email: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyEmailRequest"];
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
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
    verify_reset_code: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyResetCodeRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataVerifyResetCodeResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                        /** @enum {string} */
                        status: "Err";
                    };
                    "text/plain": string;
                };
            };
        };
    };
}
export enum ApiPaths {
    set_user_roles = "/admin/user/{id}/roles",
    admin_users = "/admin/users",
    find_many_artist = "/artist",
    create_artist = "/artist",
    explore_artist = "/artist/explore",
    find_artist_by_id = "/artist/{id}",
    upsert_artist_correction = "/artist/{id}",
    find_artist_appearances = "/artist/{id}/appearances",
    update_artist_pending_correction = "/artist/{id}/correction/{correction_id}",
    get_artist_credits = "/artist/{id}/credits",
    find_artist_discographies_by_type = "/artist/{id}/discographies",
    find_artist_discographies_init = "/artist/{id}/discographies/init",
    get_artist_profile_image_metadata = "/artist/{id}/profile-image",
    upload_artist_profile_image = "/artist/{id}/profile-image",
    upload_avatar = "/avatar",
    create_user_collection = "/collection",
    user_collection_detail = "/collection/{id}",
    update_user_collection = "/collection/{id}",
    delete_user_collection = "/collection/{id}",
    user_collection_items = "/collection/{id}/items",
    create_user_collection_item = "/collection/{id}/items",
    reorder_user_collection_items = "/collection/{id}/items/reorder",
    delete_user_collection_item = "/collection/{id}/items/{item_id}",
    public_user_collections = "/collections/public",
    search_user_collections = "/collections/search",
    delete_comment = "/comment/{id}",
    compare_corrections = "/correction/{id1}/compare/{id2}",
    get_correction = "/correction/{id}",
    moderate_correction = "/correction/{id}",
    get_correction_diff = "/correction/{id}/diff",
    get_correction_revisions = "/correction/{id}/revisions",
    set_correction_subscription = "/correction/{id}/subscription",
    create_credit_role = "/credit-role",
    find_many_credit_roles_summary = "/credit-role/summary",
    find_credit_role_by_id = "/credit-role/{id}",
    upsert_credit_role_correction = "/credit-role/{id}",
    update_credit_role_pending_correction = "/credit-role/{id}/correction/{correction_id}",
    editable_user_roles = "/editable-user-roles",
    find_event_by_keyword = "/event",
    create_event = "/event",
    explore_event = "/event/explore",
    find_event_by_id = "/event/{id}",
    upsert_event_correction = "/event/{id}",
    update_event_pending_correction = "/event/{id}/correction/{correction_id}",
    forgot_password = "/forgot-password",
    health_check = "/health_check",
    home_metadata = "/home/metadata",
    pending_image_queue = "/image-queue",
    pending_image_queue_count = "/image-queue/pending-count",
    image_queue_detail = "/image-queue/{id}",
    moderate_image_queue = "/image-queue/{id}",
    find_image_queue_comments = "/image-queue/{id}/comments",
    create_image_queue_comment = "/image-queue/{id}/comments",
    set_image_queue_subscription = "/image-queue/{id}/subscription",
    find_label_by_keyword = "/label",
    create_label = "/label",
    explore_label = "/label/explore",
    find_label_by_id = "/label/{id}",
    upsert_label_correction = "/label/{id}",
    update_label_pending_correction = "/label/{id}/correction/{correction_id}",
    language_list = "/languages",
    list_notifications = "/notifications",
    read_all = "/notifications/read-all",
    unread_count = "/notifications/unread-count",
    mark_read = "/notifications/{notification_id}/read",
    save_notification = "/notifications/{notification_id}/saved",
    unsave_notification = "/notifications/{notification_id}/saved",
    mark_unread = "/notifications/{notification_id}/unread",
    profile = "/profile",
    upload_profile_banner = "/profile-banner",
    update_bio = "/profile/bio",
    followed_user_collections = "/profile/followed-collections",
    profile_with_name = "/profile/{name}",
    follow_user = "/profile/{name}/follow",
    unfollow_user = "/profile/{name}/follow",
    find_release_by_keyword = "/release",
    create_release = "/release",
    explore_release = "/release/explore",
    find_release_by_id = "/release/{id}",
    update_release = "/release/{id}",
    update_release_pending_correction = "/release/{id}/correction/{correction_id}",
    get_release_cover_art_metadata = "/release/{id}/cover-art",
    upload_release_cover_art = "/release/{id}/cover-art",
    resend_verification_email = "/resend-verification-email",
    reset_password = "/reset-password",
    search_all = "/search",
    search_artist = "/search/artist",
    search_event = "/search/event",
    search_label = "/search/label",
    search_release = "/search/release",
    search_song = "/search/song",
    search_tag = "/search/tag",
    sign_in = "/sign-in",
    sign_out = "/sign-out",
    sign_up = "/sign-up",
    find_song_by_keyword = "/song",
    create_song = "/song",
    find_one_song_lyrics = "/song-lyrics",
    create_song_lyrics = "/song-lyrics",
    find_many_song_lyrics = "/song-lyrics/many",
    find_song_lyrics_by_id = "/song-lyrics/{id}",
    update_song_lyrics = "/song-lyrics/{id}",
    update_song_lyrics_pending_correction = "/song-lyrics/{id}/correction/{correction_id}",
    song_relation_types = "/song-relation-types",
    explore_song = "/song/explore",
    find_song_by_id = "/song/{id}",
    update_song = "/song/{id}",
    update_song_pending_correction = "/song/{id}/correction/{correction_id}",
    find_tag_by_keyword = "/tag",
    create_tag = "/tag",
    explore_tag = "/tag/explore",
    find_tag_by_id = "/tag/{id}",
    upsert_tag_correction = "/tag/{id}",
    update_tag_pending_correction = "/tag/{id}/correction/{correction_id}",
    follow_user_collection = "/user-collections/{id}/follow",
    unfollow_user_collection = "/user-collections/{id}/follow",
    stream_user_events = "/user-events/stream",
    user_roles = "/user-roles",
    user_image_queue = "/user/{id}/image-queue",
    user_collections = "/user/{username}/collections",
    verify_email = "/verify-email",
    verify_reset_code = "/verify-reset-code",
    entity_user_collections = "/{entity_type}/{id}/collections",
    entity_corrections = "/{entity_type}/{id}/corrections",
    pending_correction = "/{entity_type}/{id}/pending-correction",
    vote_tag = "/{entity_type}/{id}/tag-vote",
    delete_vote = "/{entity_type}/{id}/tag-vote",
    get_tags = "/{entity_type}/{id}/tags",
    find_entity_comments = "/{target_type}/{id}/comments",
    create_entity_comment = "/{target_type}/{id}/comments"
}
