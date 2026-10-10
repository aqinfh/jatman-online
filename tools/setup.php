<?php
/**
 * Setup situs lokal yang idempotent. Jalankan: npm run setup (dev) atau lewat npm run test:php (env tes).
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}

$jatman_lang = WP_CLI::runcommand( 'language core is-installed id_ID', [ 'return' => 'all', 'exit_error' => false ] );
if ( 0 !== $jatman_lang->return_code ) {
	WP_CLI::runcommand( 'language core install id_ID' );
}
WP_CLI::runcommand( 'site switch-language id_ID' );
WP_CLI::runcommand( 'theme activate jatman' );

update_option( 'blogname', 'JATMAN Online' );
update_option( 'blogdescription', 'Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah' );
update_option( 'timezone_string', 'Asia/Jakarta' );
update_option( 'date_format', 'j F Y' );
update_option( 'show_on_front', 'posts' );
update_option( 'posts_per_page', 12 );
update_option( 'show_avatars', 1 );

global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/%postname%/' );

// Hapus konten bawaan WordPress supaya tidak ikut tampil di beranda sample.
foreach ( [ [ 'hello-world', 'post' ], [ 'sample-page', 'page' ], [ 'contoh-halaman', 'page' ] ] as [ $slug, $type ] ) {
	$default = get_page_by_path( $slug, OBJECT, $type );
	if ( $default ) {
		wp_delete_post( $default->ID, true );
	}
}

if ( function_exists( 'jatman_ensure_categories' ) ) {
	jatman_ensure_categories();
}
flush_rewrite_rules( false );

WP_CLI::success( 'Setup selesai.' );
