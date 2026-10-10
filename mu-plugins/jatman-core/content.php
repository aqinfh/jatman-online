<?php
/**
 * Paragraf yang isinya teks Arab (class jm-arab, dari importer) diberi lang & dir saat dirender,
 * supaya markup block tetap valid di editor.
 */

defined( 'ABSPATH' ) || exit;

add_filter(
	'render_block_core/paragraph',
	static function ( string $html ): string {
		if ( ! str_contains( $html, 'jm-arab' ) ) {
			return $html;
		}
		$p = new WP_HTML_Tag_Processor( $html );
		if ( $p->next_tag( 'p' ) && $p->has_class( 'jm-arab' ) ) {
			$p->set_attribute( 'lang', 'ar' );
			$p->set_attribute( 'dir', 'rtl' );
		}
		return $p->get_updated_html();
	}
);
