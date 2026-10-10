<?php
/**
 * SVG inline dari assets/img (supaya bisa diwarnai lewat CSS currentColor).
 */

defined( 'ABSPATH' ) || exit;

function jatman_inline_svg( string $file, string $class = '' ): string {
	static $cache = [];
	if ( ! isset( $cache[ $file ] ) ) {
		$path           = get_theme_file_path( 'assets/img/' . basename( $file ) );
		$cache[ $file ] = is_readable( $path ) ? (string) file_get_contents( $path ) : '';
	}
	$p = new WP_HTML_Tag_Processor( $cache[ $file ] );
	if ( ! $p->next_tag( 'svg' ) ) {
		return '';
	}
	if ( $class ) {
		$p->add_class( $class );
	}
	$p->set_attribute( 'aria-hidden', 'true' );
	$p->set_attribute( 'focusable', 'false' );
	return $p->get_updated_html();
}
