<?php
/**
 * Kartu post yang dipakai di semua daftar. Judul/ringkasan di-escape sekali (esc_html tidak
 * meng-encode ulang entitas hasil wptexturize).
 */

defined( 'ABSPATH' ) || exit;

/** Kategori terdalam milik post, mis. "Nasional" (bukan "Berita"). */
function jatman_primary_category( WP_Post $post ): ?WP_Term {
	$cats = get_the_category( $post->ID );
	if ( ! $cats ) {
		return null;
	}
	usort( $cats, static fn( WP_Term $x, WP_Term $y ): int => count( get_ancestors( $y->term_id, 'category' ) ) <=> count( get_ancestors( $x->term_id, 'category' ) ) );
	return $cats[0];
}

/** Perkiraan waktu baca dalam menit (200 kata/menit, minimal 1). */
function jatman_reading_time( WP_Post $post ): int {
	$text  = wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
	$words = preg_split( '/\s+/u', trim( $text ), -1, PREG_SPLIT_NO_EMPTY ) ?: [];
	return max( 1, (int) ceil( count( $words ) / 200 ) );
}

/**
 * Ringkasan untuk kartu: dateline gaya web lama ("Jakarta, JATMAN Online –") dibuang supaya
 * kalimat pertama yang tampil adalah isi, lalu dipotong ke jumlah kata tertentu.
 */
function jatman_clean_excerpt( WP_Post $post, int $words ): string {
	$text = wp_strip_all_tags( has_excerpt( $post ) ? $post->post_excerpt : get_the_excerpt( $post ) );
	$text = preg_replace( '/^\s*[\p{Lu}][\p{L} .\'’-]{1,40},\s*JATMAN Online\s*[–—-]?\s*/u', '', $text );
	return wp_trim_words( trim( (string) $text ), $words, '…' );
}

function jatman_card_meta( WP_Post $post ): string {
	return sprintf(
		'<p class="jm-meta"><span class="jm-meta__author">%s</span><time datetime="%s">%s</time></p>',
		esc_html( get_the_author_meta( 'display_name', (int) $post->post_author ) ),
		esc_attr( get_the_date( 'c', $post ) ),
		esc_html( get_the_date( 'j M Y', $post ) )
	);
}

function jatman_card( WP_Post $post, string $variant ): string {
	$url      = get_permalink( $post );
	// Semua varian bergambar selalu punya wadah gambar; tanpa gambar utama dipakai thumbnail cadangan (knot).
	$with_img = in_array( $variant, [ 'hero-main', 'hero-side', 'list', 'feature', 'title', 'card', 'portrait' ], true );
	$size     = [ 'hero-main' => 'jatman-hero', 'portrait' => 'jatman-portrait' ][ $variant ] ?? 'jatman-card';
	$heading  = match ( $variant ) {
		'hero-main'        => 'h2',
		'feature', 'title' => 'h4',
		default            => 'h3',
	};
	$cat      = in_array( $variant, [ 'hero-main', 'hero-side', 'list', 'card' ], true ) ? jatman_primary_category( $post ) : null;
	$excerpt  = in_array( $variant, [ 'hero-main', 'list', 'feature' ], true )
		? jatman_clean_excerpt( $post, 'hero-main' === $variant ? 32 : 22 )
		: '';
	$eager    = 'hero-main' === $variant;

	$html = '<article class="jm-card jm-card--' . esc_attr( $variant ) . '">';
	if ( $with_img && ! has_post_thumbnail( $post ) ) {
		$html .= sprintf(
			'<a class="jm-card__media jm-card__media--empty" href="%s" tabindex="-1" aria-hidden="true">%s</a>',
			esc_url( $url ),
			jatman_inline_svg( 'knot.svg' )
		);
	} elseif ( $with_img ) {
		$html .= sprintf(
			'<a class="jm-card__media" href="%s" tabindex="-1" aria-hidden="true">%s</a>',
			esc_url( $url ),
			get_the_post_thumbnail(
				$post,
				$size,
				[
					'alt'           => '',
					'loading'       => $eager ? 'eager' : 'lazy',
					'fetchpriority' => $eager ? 'high' : 'auto',
					'decoding'      => 'async',
				]
			)
		);
	}
	$html .= '<div class="jm-card__body">';
	if ( 'qa' === $variant ) {
		$html .= '<span class="jm-label jm-label--qa">Tanya</span>';
	}
	if ( $cat ) {
		$html .= sprintf( '<a class="jm-label" href="%s">%s</a>', esc_url( get_term_link( $cat ) ), esc_html( $cat->name ) );
	}
	$html .= sprintf( '<%1$s class="jm-card__title"><a href="%2$s">%3$s</a></%1$s>', $heading, esc_url( $url ), esc_html( get_the_title( $post ) ) );
	if ( $excerpt ) {
		$html .= '<p class="jm-card__excerpt">' . esc_html( $excerpt ) . '</p>';
	}
	if ( ! in_array( $variant, [ 'qa', 'title' ], true ) ) {
		$html .= jatman_card_meta( $post );
	}
	return $html . '</div></article>';
}
