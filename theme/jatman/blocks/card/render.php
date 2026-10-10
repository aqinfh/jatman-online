<?php
/**
 * @var array    $attributes
 * @var WP_Block $block
 */
$jatman_post = get_post( (int) ( $block->context['postId'] ?? 0 ) );
echo $jatman_post ? jatman_card( $jatman_post, $attributes['variant'] ?? 'card' ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput
