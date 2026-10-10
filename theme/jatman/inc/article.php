<?php
/**
 * Bagian halaman artikel: breadcrumb, dek, byline, gambar utama, tombol bagikan.
 */

defined( 'ABSPATH' ) || exit;

function jatman_render_breadcrumb( int $post_id ): string {
	$post = get_post( $post_id );
	if ( ! $post ) {
		return '';
	}
	$items = [ [ 'Beranda', home_url( '/' ) ] ];
	$cat   = jatman_primary_category( $post );
	if ( $cat ) {
		foreach ( array_reverse( get_ancestors( $cat->term_id, 'category', 'taxonomy' ) ) as $ancestor_id ) {
			$ancestor = get_term( $ancestor_id, 'category' );
			$items[]  = [ $ancestor->name, get_term_link( $ancestor ) ];
		}
		$items[] = [ $cat->name, get_term_link( $cat ) ];
	}
	$lis = array_map( static fn( array $i ): string => sprintf( '<li><a href="%s">%s</a></li>', esc_url( $i[1] ), esc_html( $i[0] ) ), $items );
	return '<nav class="jm-breadcrumb" aria-label="Breadcrumb"><ol>' . implode( '', $lis ) . '</ol></nav>';
}

function jatman_render_dek( int $post_id ): string {
	$post = get_post( $post_id );
	return $post && has_excerpt( $post ) ? '<p class="jm-dek">' . esc_html( wp_strip_all_tags( $post->post_excerpt ) ) . '</p>' : '';
}

function jatman_render_byline( int $post_id ): string {
	$post = get_post( $post_id );
	if ( ! $post ) {
		return '';
	}
	$author = (int) $post->post_author;
	return sprintf(
		'<div class="jm-byline" data-jm-view="%s">%s<div class="jm-byline__text"><a class="jm-byline__author" href="%s">%s</a><p class="jm-byline__meta"><time datetime="%s">%s</time><span aria-hidden="true">·</span><span>%d menit baca</span></p></div></div>',
		esc_url( rest_url( 'jatman/v1/views/' . $post->ID ) ),
		get_avatar( $author, 44, '', '', [ 'class' => 'jm-byline__avatar' ] ),
		esc_url( get_author_posts_url( $author ) ),
		esc_html( get_the_author_meta( 'display_name', $author ) ),
		esc_attr( get_the_date( 'c', $post ) ),
		esc_html( get_the_date( 'j M Y · H:i T', $post ) ),
		jatman_reading_time( $post )
	);
}

function jatman_render_featured_figure( int $post_id, string $wrapper_attributes ): string {
	$image_id = (int) get_post_thumbnail_id( $post_id );
	if ( ! $image_id ) {
		return '';
	}
	$caption = wp_get_attachment_caption( $image_id );
	return sprintf(
		'<figure %s>%s%s</figure>',
		$wrapper_attributes ?: 'class="jm-figure"',
		wp_get_attachment_image( $image_id, 'jatman-hero', false, [ 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(min-width: 1080px) 1024px, 100vw' ] ),
		$caption ? '<figcaption>' . esc_html( $caption ) . '</figcaption>' : ''
	);
}

/** @return array<string, string> nama tujuan => URL share */
function jatman_share_links( int $post_id ): array {
	$url   = rawurlencode( get_permalink( $post_id ) );
	$title = rawurlencode( html_entity_decode( get_the_title( $post_id ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
	return [
		'WhatsApp' => "https://wa.me/?text={$title}%20{$url}",
		'Facebook' => "https://www.facebook.com/sharer/sharer.php?u={$url}",
		'X'        => "https://x.com/intent/post?text={$title}&url={$url}",
		'Telegram' => "https://t.me/share/url?url={$url}&text={$title}",
	];
}

/** Ikon logo layanan dari block Social Icons bawaan WordPress (tanpa aset tambahan). */
function jatman_share_icon( string $service ): string {
	if ( ! function_exists( 'block_core_social_link_get_icon' ) ) {
		return '';
	}
	$p = new WP_HTML_Tag_Processor( block_core_social_link_get_icon( $service ) );
	if ( ! $p->next_tag( 'svg' ) ) {
		return '';
	}
	$p->set_attribute( 'aria-hidden', 'true' );
	$p->set_attribute( 'focusable', 'false' );
	return $p->get_updated_html();
}

function jatman_render_share( int $post_id ): string {
	$links = '';
	foreach ( jatman_share_links( $post_id ) as $name => $href ) {
		$links .= sprintf(
			'<a class="jm-share__btn jm-share__btn--%4$s" href="%1$s" target="_blank" rel="noopener noreferrer" title="Bagikan ke %2$s">%3$s<span class="screen-reader-text">Bagikan ke %2$s</span></a>',
			esc_url( $href ),
			esc_attr( $name ),
			jatman_share_icon( strtolower( $name ) ),
			esc_attr( strtolower( $name ) )
		);
	}
	return sprintf(
		'<div class="jm-share" role="group" aria-label="Bagikan artikel">%s<button type="button" class="jm-share__btn jm-share__btn--chain" data-jm-copy="%s" title="Salin tautan">%s<span class="screen-reader-text">Salin tautan</span></button><span class="jm-share__status" role="status" aria-live="polite"></span></div>',
		$links,
		esc_attr( get_permalink( $post_id ) ),
		jatman_share_icon( 'chain' )
	);
}
