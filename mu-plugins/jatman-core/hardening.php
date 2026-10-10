<?php
/**
 * Pengerasan dasar: versi WordPress tidak diumumkan, XML-RPC dimatikan, dan daftar user lewat REST
 * hanya untuk yang login (slug penulis tetap publik lewat /profile/<slug>/, sama seperti web lama).
 */

defined( 'ABSPATH' ) || exit;

remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );

add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'xmlrpc_methods', '__return_empty_array' );
add_filter(
	'wp_headers',
	static function ( array $headers ): array {
		unset( $headers['X-Pingback'] );
		return $headers;
	}
);

add_filter(
	'rest_endpoints',
	static function ( array $endpoints ): array {
		if ( ! is_user_logged_in() ) {
			unset( $endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)'], $endpoints['/wp/v2/users/me'] );
		}
		return $endpoints;
	}
);
