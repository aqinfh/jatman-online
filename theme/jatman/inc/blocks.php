<?php
/**
 * Block dinamis tema: setiap folder blocks/<nama>/block.json didaftarkan otomatis.
 * Di editor ditampilkan lewat ServerSideRender (tanpa build step).
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function (): void {
		$names = [];
		foreach ( glob( get_theme_file_path( 'blocks/*/block.json' ) ) ?: [] as $json ) {
			$type = register_block_type( dirname( $json ) );
			if ( $type ) {
				$names[] = $type->name;
			}
		}
		wp_register_script(
			'jatman-editor-blocks',
			get_theme_file_uri( 'assets/js/editor-blocks.js' ),
			[ 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-server-side-render' ],
			wp_get_theme()->get( 'Version' ),
			true
		);
		wp_add_inline_script( 'jatman-editor-blocks', 'window.jatmanBlocks = ' . wp_json_encode( $names ) . ';', 'before' );
	}
);

add_action(
	'enqueue_block_editor_assets',
	static function (): void {
		wp_enqueue_script( 'jatman-editor-blocks' );
	}
);
