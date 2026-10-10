<?php
/**
 * Pilihan Redaksi: penanda di post yang diatur redaksi lewat checkbox di editor.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function (): void {
		register_post_meta(
			'post',
			'jatman_pilihan',
			[
				'type'          => 'boolean',
				'single'        => true,
				'default'       => false,
				'show_in_rest'  => true,
				// Hanya editor/admin: penulis tidak bisa menjadikan tulisannya sendiri Pilihan Redaksi.
				'auth_callback' => static fn( $allowed, $meta_key, $post_id, $user_id ): bool => user_can( $user_id, 'edit_others_posts' ),
			]
		);
	}
);

add_action(
	'enqueue_block_editor_assets',
	static function (): void {
		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->post_type || ! current_user_can( 'edit_others_posts' ) ) {
			return;
		}
		$file = __DIR__ . '/pilihan-panel.js';
		wp_enqueue_script(
			'jatman-pilihan-panel',
			WPMU_PLUGIN_URL . '/jatman-core/pilihan-panel.js',
			[ 'wp-plugins', 'wp-editor', 'wp-data', 'wp-components', 'wp-element' ],
			(string) filemtime( $file ),
			true
		);
	}
);
