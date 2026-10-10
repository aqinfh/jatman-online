<?php
/**
 * Pencarian publik hanya mencari artikel (post). Halaman statis (Tentang, Indeks, Redaksi, …)
 * tidak ikut, karena tampil janggal di daftar berita.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'pre_get_posts',
	static function ( WP_Query $query ): void {
		if ( ! is_admin() && $query->is_main_query() && $query->is_search() ) {
			$query->set( 'post_type', 'post' );
		}
	}
);
