<?php
/**
 * Avatar penulis dari media lokal (user meta jatman_avatar_id). Tidak pernah memanggil Gravatar.
 */

defined( 'ABSPATH' ) || exit;

function jatman_resolve_avatar_user( $id_or_email ): ?WP_User {
	if ( $id_or_email instanceof WP_User ) {
		return $id_or_email;
	}
	if ( $id_or_email instanceof WP_Post ) {
		return get_userdata( (int) $id_or_email->post_author ) ?: null;
	}
	if ( $id_or_email instanceof WP_Comment ) {
		return $id_or_email->user_id ? ( get_userdata( (int) $id_or_email->user_id ) ?: null ) : null;
	}
	if ( is_numeric( $id_or_email ) ) {
		return get_userdata( (int) $id_or_email ) ?: null;
	}
	if ( is_string( $id_or_email ) && is_email( $id_or_email ) ) {
		return get_user_by( 'email', $id_or_email ) ?: null;
	}
	return null;
}

add_filter(
	'pre_get_avatar_data',
	static function ( array $args, $id_or_email ): array {
		$user          = jatman_resolve_avatar_user( $id_or_email );
		$attachment_id = $user ? (int) get_user_meta( $user->ID, 'jatman_avatar_id', true ) : 0;
		$url           = $attachment_id ? wp_get_attachment_image_url( $attachment_id, 'thumbnail' ) : false;

		$args['url']          = $url ?: WPMU_PLUGIN_URL . '/jatman-core/avatar-default.svg';
		$args['found_avatar'] = true;
		return $args;
	},
	10,
	2
);
