<?php
/**
 * Hitungan pembaca untuk "Terpopuler". Disimpan di post meta jatman_views; ditambah lewat
 * POST /jatman/v1/views/<id> (sendBeacon dari halaman artikel). Satu IP dihitung sekali per
 * 30 menit per artikel. Saat migrasi, pageviews Varient diimpor ke meta yang sama.
 */

defined( 'ABSPATH' ) || exit;

function jatman_views( int $post_id ): int {
	return (int) get_post_meta( $post_id, 'jatman_views', true );
}

add_action(
	'init',
	static function (): void {
		register_post_meta(
			'post',
			'jatman_views',
			[
				'type'         => 'integer',
				'single'       => true,
				'default'      => 0,
				'show_in_rest' => false,
			]
		);
	}
);

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			'jatman/v1',
			'/views/(?P<id>\d+)',
			[
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => static function ( WP_REST_Request $request ) {
					$post = get_post( (int) $request['id'] );
					if ( ! $post || 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
						return new WP_Error( 'jatman_not_found', 'Artikel tidak ditemukan.', [ 'status' => 404 ] );
					}
					$ip  = (string) ( $_SERVER['REMOTE_ADDR'] ?? '' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
					$key = 'jatman_view_' . md5( $ip . '|' . $post->ID );
					if ( ! get_transient( $key ) ) {
						set_transient( $key, 1, 30 * MINUTE_IN_SECONDS );
						update_post_meta( $post->ID, 'jatman_views', jatman_views( $post->ID ) + 1 );
					}
					return [ 'views' => jatman_views( $post->ID ) ];
				},
			]
		);
	}
);
