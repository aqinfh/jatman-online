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
		'popular'   => false,
		'moreUrl'   => '',
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
		// Artikel yang sedang dibuka tidak pernah ikut tampil di daftar mana pun pada halamannya.
		'post__not_in'        => array_values( array_filter( array_merge( $a['dedupe'] ? jatman_seen_ids() : [], $exclude, [ is_singular() ? get_queried_object_id() : 0 ] ) ) ),
	];
	if ( '' !== $a['category'] ) {
		$args['category_name'] = $a['category'];
	}
	if ( $a['pilihan'] ) {
		$args['meta_query'] = [ [ 'key' => 'jatman_pilihan', 'value' => '1' ] ];
	}
	if ( $a['popular'] ) {
		$args['jatman_popular']   = true; // diurutkan oleh filter posts_clauses di bawah
		$args['suppress_filters'] = false;
	}
	return get_posts( $args );
}

/**
 * Urutan Terpopuler: LEFT JOIN khusus meta jatman_views sehingga post tanpa hitungan bernilai 0
 * (meta_query OR EXISTS/NOT EXISTS bawaan WP mengurutkan memakai baris meta sembarang).
 */
add_filter(
	'posts_clauses',
	static function ( array $clauses, WP_Query $query ): array {
		if ( ! $query->get( 'jatman_popular' ) ) {
			return $clauses;
		}
		global $wpdb;
		$clauses['join']   .= " LEFT JOIN {$wpdb->postmeta} AS jm_views ON ( jm_views.post_id = {$wpdb->posts}.ID AND jm_views.meta_key = 'jatman_views' )";
		$clauses['orderby'] = "CAST( COALESCE( jm_views.meta_value, '0' ) AS UNSIGNED ) DESC, {$wpdb->posts}.post_date DESC";
		return $clauses;
	},
	10,
	2
);

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
	$more_url = '';
	if ( $a['moreUrl'] ) {
		$more_url = home_url( $a['moreUrl'] );
	} elseif ( $a['title'] && $a['category'] && ! str_contains( $a['category'], ',' ) && 'related' !== $a['layout'] ) {
		$term     = get_term_by( 'slug', $a['category'], 'category' );
		$more_url = $term ? get_term_link( $term ) : '';
	}
	$more = $more_url && $a['title'] ? sprintf(
		'<a class="jm-section__more" href="%s">%s<span class="screen-reader-text"> %s</span><span aria-hidden="true"> →</span></a>',
		esc_url( $more_url ),
		esc_html( $a['moreLabel'] ),
		esc_html( $a['title'] )
	) : '';
	$head = $a['title'] ? sprintf( '<header class="jm-section__head"><h2 class="jm-section__title">%s</h2>%s</header>', esc_html( $a['title'] ), $more ) : '';
	$band = in_array( $a['band'], [ 'cream', 'night', 'brand' ], true ) ? ' jm-band jm-band--' . $a['band'] : '';
	// Daftar kronologis dengan tujuan "lihat semua" juga diakhiri tombol (pola portal berita).
	$foot = 'list' === $a['layout'] && $a['moreUrl']
		? sprintf( '<p class="jm-section__foot"><a class="jm-button" href="%s">Lihat semua berita</a></p>', esc_url( home_url( $a['moreUrl'] ) ) )
		: '';
	return sprintf(
		'<section class="jm-section jm-section--%s%s"><div class="jm-section__inner">%s%s%s</div></section>',
		esc_attr( $a['layout'] ),
		$band,
		$head,
		$inner,
		$foot
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
		'ranked'   => '<ol class="jm-ranked">' . $cards( 'compact', true ) . '</ol>',
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
	$tabs    = '';
	$all     = [];
	foreach ( array_filter( array_map( 'trim', explode( ',', $a['category'] ) ) ) as $slug ) {
		$term  = get_term_by( 'slug', $slug, 'category' );
		$posts = $term ? jatman_query_posts( [ 'category' => $slug ] + $a ) : [];
		if ( ! $posts ) {
			continue;
		}
		$all     = array_merge( $all, $posts );
		$titles  = implode( '', array_map( static fn( WP_Post $p ): string => '<li>' . jatman_card( $p, 'title' ) . '</li>', array_slice( $posts, 1 ) ) );
		$first    = '' === $tabs;
		// Tombol tab hanya aktif di HP (theme.js); tanpa JS semua kolom tetap tampil.
		$tabs    .= sprintf(
			'<button type="button" id="jm-tab-%1$s" aria-controls="jm-panel-%1$s" aria-selected="%2$s">%3$s</button>',
			esc_attr( $slug ),
			$first ? 'true' : 'false',
			esc_html( $term->name )
		);
		$columns .= sprintf(
			'<div class="jm-region" id="jm-panel-%s"><h3 class="jm-region__title"><a href="%s">%s</a></h3>%s%s</div>',
			esc_attr( $slug ),
			esc_url( get_term_link( $term ) ),
			esc_html( $term->name ),
			jatman_card( $posts[0], 'feature' ),
			$titles ? '<ul class="jm-region__list">' . $titles . '</ul>' : ''
		);
	}
	if ( ! $columns ) {
		return [ '', [] ];
	}
	return [ '<div class="jm-regions" data-jm-tabs><div class="jm-regions__tabs" aria-label="Wilayah berita" hidden>' . $tabs . '</div>' . $columns . '</div>', $all ];
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

/** Pita Dawuh: judul artikel Dawuh terbaru ditampilkan sebagai kalimat utama, dengan ornamen knot emas. */
function jatman_dawuh_quote( WP_Post $post ): string {
	return sprintf(
		'<figure class="jm-dawuh"><span class="jm-ornament" aria-hidden="true"></span><blockquote class="jm-dawuh__text"><p><a href="%s">%s</a></p></blockquote><figcaption class="jm-dawuh__cite">%s<span aria-hidden="true">·</span><time datetime="%s">%s</time></figcaption></figure>',
		esc_url( get_permalink( $post ) ),
		esc_html( get_the_title( $post ) ),
		esc_html( get_the_author_meta( 'display_name', (int) $post->post_author ) ),
		esc_attr( get_the_date( 'c', $post ) ),
		esc_html( get_the_date( 'j F Y', $post ) )
	);
}
