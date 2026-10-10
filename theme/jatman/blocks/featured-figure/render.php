<?php
defined( 'ABSPATH' ) || exit;
/** @var WP_Block $block */
echo jatman_render_featured_figure( // phpcs:ignore WordPress.Security.EscapeOutput
	(int) ( $block->context['postId'] ?? get_queried_object_id() ),
	get_block_wrapper_attributes( [ 'class' => 'jm-figure' ] )
);
