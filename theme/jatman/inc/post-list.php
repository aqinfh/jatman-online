<?php
/**
 * Bagian daftar post (beranda, artikel terkait, 404). Kategori lewat slug, bukan ID, supaya
 * template tetap benar setelah migrasi.
 */

defined( 'ABSPATH' ) || exit;

/** ID post yang sudah tampil di halaman ini (dipakai bagian ber-dedupe). */
function jatman_seen_ids( array $add = [] ): array {
	$GLOBALS['jatman_seen'] = array_values( array_unique( array_merge( $GLOBALS['jatman_seen'] ?? [], array_map( 'intval', $add ) ) ) );
	return $GLOBALS['jatman_seen'];
}

function jatman_post_list_defaults(): array {
	return [
		'layout'    => 'list',
		'category'  => '',
		'count'     => 6,
		'pilihan'   => false,
		'title'     => '',
		'moreLabel' => 'Lihat semua',
		'band'      => '',
		'dedupe'    => false,
	];
}

/** @return WP_Post[] */
function jatman_query_posts( array $a, array $exclude = [] ): array {
	$args = [
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'posts_per_page'      => max( 1, (int) $a['count'] ),
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
		'post__not_in'        => array_values( array_filter( array_merge( $a['dedupe'] ? jatman_seen_ids() : [], $exclude ) ) ),
	];
	if ( '' !== $a['category'] ) {
		$args['category_name'] = $a['category'];
	}
	if ( $a['pilihan'] ) {
		$args['meta_query'] = [ [ 'key' => 'jatman_pilihan', 'value' => '1' ] ];
	}
	return get_posts( $args );
}

function jatman_render_post_list( array $attributes ): string {
	$a = wp_parse_args( $attributes, jatman_post_list_defaults() );
	[ $html, $posts ] = match ( $a['layout'] ) {
		'hero'    => jatman_layout_hero( $a ),
		'regions' => jatman_layout_regions( $a ),
		'related' => jatman_layout_related( $a ),
		default   => jatman_layout_simple( $a ),
	};
	jatman_seen_ids( wp_list_pluck( $posts, 'ID' ) );
	return jatman_section( $html, $a );
}

function jatman_section( string $inner, array $a ): string {
	if ( '' === $inner ) {
		return '';
	}
	$more = '';
	if ( $a['title'] && $a['category'] && ! str_contains( $a['category'], ',' ) && 'related' !== $a['layout'] ) {
		$term = get_term_by( 'slug', $a['category'], 'category' );
		if ( $term ) {
			$more = sprintf(
				'<a class="jm-section__more" href="%s">%s<span class="screen-reader-text"> %s</span><span aria-hidden="true"> →</span></a>',
				esc_url( get_term_link( $term ) ),
				esc_html( $a['moreLabel'] ),
				esc_html( $a['title'] )
			);
		}
	}
	$head = $a['title'] ? sprintf( '<header class="jm-section__head"><h2 class="jm-section__title">%s</h2>%s</header>', esc_html( $a['title'] ), $more ) : '';
	$band = in_array( $a['band'], [ 'cream', 'night' ], true ) ? ' jm-band jm-band--' . $a['band'] : '';
	return sprintf(
		'<section class="jm-section jm-section--%s%s"><div class="jm-section__inner">%s%s</div></section>',
		esc_attr( $a['layout'] ),
		$band,
		$head,
		$inner
	);
}

/** @return array{0: string, 1: WP_Post[]} */
function jatman_layout_simple( array $a ): array {
	$posts = jatman_query_posts( $a );
	if ( ! $posts ) {
		return [ '', [] ];
	}
	$cards = static fn( string $variant, bool $li = false ): string => implode(
		'',
		array_map( static fn( WP_Post $p ): string => $li ? '<li>' . jatman_card( $p, $variant ) . '</li>' : jatman_card( $p, $variant ), $posts )
	);
	$html = match ( $a['layout'] ) {
		'compact'  => '<ol class="jm-compact">' . $cards( 'compact', true ) . '</ol>',
		'qa'       => '<ul class="jm-qa">' . $cards( 'qa', true ) . '</ul>',
		'cards'    => '<div class="jm-cards">' . $cards( 'card' ) . '</div>',
		'portrait' => '<div class="jm-portraits">' . $cards( 'portrait' ) . '</div>',
		'quote'    => jatman_dawuh_quote( $posts[0] ),
		default    => '<div class="jm-list">' . $cards( 'list' ) . '</div>',
	};
	return [ $html, 'quote' === $a['layout'] ? [ $posts[0] ] : $posts ];
}

/** Berita utama = post sticky terbaru (kalau ada), lalu 4 berita terbaru di dua kolom pendamping. */
function jatman_layout_hero( array $a ): array {
	$sticky = array_map( 'intval', (array) get_option( 'sticky_posts', [] ) );
	$main   = $sticky ? get_posts( [ 'post__in' => $sticky, 'posts_per_page' => 1, 'ignore_sticky_posts' => true, 'post_status' => 'publish', 'no_found_rows' => true ] ) : [];
	$rest   = jatman_query_posts( [ 'count' => $main ? 4 : 5, 'dedupe' => false, 'pilihan' => false ] + $a, wp_list_pluck( $main, 'ID' ) );
	$posts  = array_merge( $main, $rest );
	if ( ! $posts ) {
		return [ '', [] ];
	}
	$side = static fn( array $ps, string $mod ): string => $ps
		? '<div class="jm-hero__side jm-hero__side--' . $mod . '">' . implode( '', array_map( static fn( WP_Post $p ): string => jatman_card( $p, 'hero-side' ), $ps ) ) . '</div>'
		: '';
	$html = '<div class="jm-hero"><div class="jm-hero__main">' . jatman_card( $posts[0], 'hero-main' ) . '</div>'
		. $side( array_slice( $posts, 1, 2 ), 'left' )
		. $side( array_slice( $posts, 3, 2 ), 'right' )
		. '</div>';
	return [ $html, $posts ];
}

/** Satu kolom per kategori (Nasional/Daerah/Internasional); kolom kosong dilewati. */
function jatman_layout_regions( array $a ): array {
	$columns = '';
	$all     = [];
	foreach ( array_filter( array_map( 'trim', explode( ',', $a['category'] ) ) ) as $slug ) {
		$term  = get_term_by( 'slug', $slug, 'category' );
		$posts = $term ? jatman_query_posts( [ 'category' => $slug ] + $a ) : [];
		if ( ! $posts ) {
			continue;
		}
		$all     = array_merge( $all, $posts );
		$titles  = implode( '', array_map( static fn( WP_Post $p ): string => '<li>' . jatman_card( $p, 'title' ) . '</li>', array_slice( $posts, 1 ) ) );
		$columns .= sprintf(
			'<div class="jm-region"><h3 class="jm-region__title"><a href="%s">%s</a></h3>%s%s</div>',
			esc_url( get_term_link( $term ) ),
			esc_html( $term->name ),
			jatman_card( $posts[0], 'feature' ),
			$titles ? '<ul class="jm-region__list">' . $titles . '</ul>' : ''
		);
	}
	return [ $columns ? '<div class="jm-regions">' . $columns . '</div>' : '', $all ];
}

/** Artikel terkait: rubrik yang sama dengan artikel yang sedang dibuka, kecuali dirinya. */
function jatman_layout_related( array $a ): array {
	$current = get_queried_object_id();
	$post    = $current ? get_post( $current ) : null;
	$cat     = $post ? jatman_primary_category( $post ) : null;
	if ( ! $cat ) {
		return [ '', [] ];
	}
	$posts = jatman_query_posts( [ 'category' => $cat->slug, 'dedupe' => false ] + $a, [ $current ] );
	$html  = $posts ? '<div class="jm-cards jm-cards--related">' . implode( '', array_map( static fn( WP_Post $p ): string => jatman_card( $p, 'card' ), $posts ) ) . '</div>' : '';
	return [ $html, $posts ];
}

function jatman_dawuh_quote( WP_Post $post ): string {
	$text = has_excerpt( $post ) ? $post->post_excerpt : wp_trim_words( get_the_excerpt( $post ), 45 );
	return sprintf(
		'<figure class="jm-dawuh"><blockquote class="jm-dawuh__text"><p>%s</p></blockquote><figcaption class="jm-dawuh__cite"><a href="%s">%s</a><span>%s</span></figcaption></figure>',
		esc_html( wp_strip_all_tags( $text ) ),
		esc_url( get_permalink( $post ) ),
		esc_html( get_the_title( $post ) ),
		esc_html( get_the_author_meta( 'display_name', (int) $post->post_author ) )
	);
}
