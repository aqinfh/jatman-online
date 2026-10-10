<?php
defined( 'ABSPATH' ) || exit;
/** @var array $attributes */
echo jatman_render_post_list( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput -- di-escape di dalam fungsi.
