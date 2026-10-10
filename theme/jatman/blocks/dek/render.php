<?php
/** @var WP_Block $block */
echo jatman_render_dek( (int) ( $block->context['postId'] ?? get_queried_object_id() ) ); // phpcs:ignore WordPress.Security.EscapeOutput
