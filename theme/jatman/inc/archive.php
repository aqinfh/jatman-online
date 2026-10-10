<?php
/**
 * Pita judul untuk arsip rubrik/tag, halaman penulis, dan pencarian.
 */

defined( 'ABSPATH' ) || exit;

function jatman_render_archive_header(): string {
	$title   = '';
	$desc    = '';
	$extra   = '';
	$media   = '';

	if ( is_category() || is_tag() ) {
		$term    = get_queried_object();
		$title   = $term->name;
		$desc    = term_description( $term );
		$extra   = is_category() ? jatman_berita_tabs( $term ) : '';
	} elseif ( is_author() ) {
		$user    = get_queried_object();
		$title   = $user->display_name;
		$desc    = $user->description ? wpautop( esc_html( $user->description ) ) : '';
		$media   = get_avatar( $user->ID, 96, '', '', [ 'class' => 'jm-archive-head__avatar' ] );
		$extra   = sprintf( '<p class="jm-archive-head__count">%s tulisan</p>', esc_html( number_format_i18n( count_user_posts( $user->ID, 'post', true ) ) ) );
	} elseif ( is_search() ) {
		global $wp_query;
		$title   = sprintf( '%s hasil untuk “%s”', number_format_i18n( (int) $wp_query->found_posts ), get_search_query( false ) );
		$extra   = do_blocks( '<!-- wp:search {"label":"Cari","showLabel":false,"placeholder":"Cari berita, dawuh, tokoh…","buttonText":"Cari"} /-->' );
	} elseif ( is_page() ) {
		$title = get_the_title();
		$desc  = has_excerpt() ? wpautop( esc_html( get_the_excerpt() ) ) : '';
	} else {
		$title = wp_strip_all_tags( get_the_archive_title() );
	}

	return sprintf(
		'<div class="jm-archive-head"><div class="jm-archive-head__inner">%s<h1>%s</h1>%s%s</div></div>',
		$media,
		esc_html( $title ),
		$desc ? '<div class="jm-archive-head__desc">' . wp_kses_post( $desc ) . '</div>' : '',
		$extra
	);
}

/** Tab Semua/Nasional/Daerah/Internasional untuk rubrik Berita dan anak-anaknya. */
function jatman_berita_tabs( WP_Term $term ): string {
	if ( ! function_exists( 'jatman_categories' ) ) {
		return '';
	}
	$root = $term;
	while ( $root->parent ) {
		$root = get_term( $root->parent, 'category' );
	}
	if ( 'berita' !== $root->slug ) {
		return '';
	}
	$items = [ [ 'Semua', $root ] ];
	foreach ( jatman_categories() as $slug => [ , $parent ] ) {
		$child = 'berita' === $parent ? get_term_by( 'slug', $slug, 'category' ) : false;
		if ( $child ) {
			$items[] = [ $child->name, $child ];
		}
	}
	$lis = '';
	foreach ( $items as [ $label, $t ] ) {
		$lis .= sprintf(
			'<li><a href="%s"%s>%s</a></li>',
			esc_url( get_term_link( $t ) ),
			$t->term_id === $term->term_id ? ' aria-current="page"' : '',
			esc_html( $label )
		);
	}
	return '<nav class="jm-tabs" aria-label="Sub-rubrik Berita"><ul>' . $lis . '</ul></nav>';
}
