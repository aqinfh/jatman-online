<?php
/**
 * URL lama Varient: /<slug-post>/, /berita/nasional/, /profile/<penulis>/, /tag/<tag>/.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function (): void {
		global $wp_rewrite;
		$wp_rewrite->author_base = 'profile';
	}
);

/** Path lengkap kategori, mis. "berita/nasional". */
function jatman_category_path( WP_Term $term ): string {
	$slugs = [];
	foreach ( array_reverse( get_ancestors( $term->term_id, 'category', 'taxonomy' ) ) as $ancestor_id ) {
		$slugs[] = get_term( $ancestor_id, 'category' )->slug;
	}
	$slugs[] = $term->slug;
	return implode( '/', $slugs );
}

add_filter(
	'term_link',
	static function ( string $url, WP_Term $term, string $taxonomy ): string {
		if ( 'category' !== $taxonomy || ! get_option( 'permalink_structure' ) ) {
			return $url;
		}
		return home_url( user_trailingslashit( jatman_category_path( $term ), 'category' ) );
	},
	10,
	3
);

/**
 * Ganti rule bawaan /category/... dengan rule per kategori tanpa base. Rule kategori didaftarkan
 * sebelum rule post, jadi kategori yang path-nya sudah dipakai post/halaman dilewati: post menang.
 */
add_filter(
	'category_rewrite_rules',
	static function (): array {
		$rules = [];
		foreach ( get_terms( [ 'taxonomy' => 'category', 'hide_empty' => false ] ) as $term ) {
			$path = jatman_category_path( $term );
			if ( get_page_by_path( $path, OBJECT, [ 'post', 'page' ] ) ) {
				error_log( "[jatman] /$path/ sudah dipakai post/halaman; arsip kategori '{$term->slug}' tidak diberi URL tanpa base." );
				continue;
			}
			$rules[ "$path/feed/(feed|rdf|rss|rss2|atom)/?$" ] = "index.php?category_name=$path&feed=\$matches[1]";
			$rules[ "$path/(feed|rdf|rss|rss2|atom)/?$" ]      = "index.php?category_name=$path&feed=\$matches[1]";
			$rules[ "$path/page/?([0-9]{1,})/?$" ]             = "index.php?category_name=$path&paged=\$matches[1]";
			$rules[ "$path/?$" ]                               = "index.php?category_name=$path";
		}
		return $rules;
	}
);

/** Buang cache rewrite supaya dibangun ulang di request berikutnya. */
function jatman_invalidate_rewrites(): void {
	delete_option( 'rewrite_rules' );
}

foreach ( [ 'created_category', 'edited_category', 'delete_category' ] as $jatman_hook ) {
	add_action( $jatman_hook, 'jatman_invalidate_rewrites' );
}

add_action(
	'wp_insert_post',
	static function ( int $post_id, WP_Post $post ): void {
		if ( in_array( $post->post_type, [ 'post', 'page' ], true ) && $post->post_name && term_exists( $post->post_name, 'category' ) ) {
			jatman_invalidate_rewrites();
		}
	},
	10,
	2
);
