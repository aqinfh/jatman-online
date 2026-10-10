<?php
defined( 'ABSPATH' ) || exit;
/** Lockup JATMAN Online: knot (warna mengikuti tema) + wordmark teks. */
?>
<a <?php echo get_block_wrapper_attributes( [ 'class' => 'jm-brand' ] ); ?> href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
	<?php echo jatman_inline_svg( 'knot.svg', 'jm-brand__mark' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	<span class="jm-brand__word"><span class="jm-brand__jatman">JATMAN</span> <span class="jm-brand__online">Online</span></span>
</a>
