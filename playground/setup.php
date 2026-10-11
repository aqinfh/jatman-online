<?php
/**
 * Setup demo WordPress Playground, dijalankan oleh blueprint.json setelah tema, mu-plugin, dan tools tersalin.
 * Padanan tools/setup.php + tools/sample/import.php tanpa WP-CLI (bahasa dipasang langkah setSiteLanguage).
 */

defined( 'ABSPATH' ) || exit;

update_option( 'blogname', 'JATMAN Online' );
update_option( 'blogdescription', 'Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah' );
update_option( 'timezone_string', 'Asia/Jakarta' );
update_option( 'date_format', 'j F Y' );
update_option( 'show_on_front', 'posts' );
update_option( 'posts_per_page', 12 );
update_option( 'show_avatars', 1 );

// Playground web otomatis login sebagai admin; sembunyikan toolbar di tampilan depan supaya demo terlihat seperti pengunjung biasa.
update_user_meta( 1, 'show_admin_bar_front', 'false' );

global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/%postname%/' );

foreach ( [ [ 'hello-world', 'post' ], [ 'sample-page', 'page' ], [ 'contoh-halaman', 'page' ] ] as [ $jatman_slug, $jatman_type ] ) {
	$jatman_default = get_page_by_path( $jatman_slug, OBJECT, $jatman_type );
	if ( $jatman_default ) {
		wp_delete_post( $jatman_default->ID, true );
	}
}

require_once ABSPATH . 'tools/importer/class-jatman-importer.php';

$jatman_base     = ABSPATH . 'tools/sample/data';
$jatman_data     = json_decode( file_get_contents( "$jatman_base/posts.json" ), true, 512, JSON_THROW_ON_ERROR );
$jatman_importer = new Jatman_Importer( $jatman_base );
$jatman_stats    = $jatman_importer->run( $jatman_data );
foreach ( require ABSPATH . 'tools/sample/pages.php' as $jatman_page ) {
	$jatman_importer->upsert_page( $jatman_page );
}
flush_rewrite_rules( false );

printf(
	"Demo siap: %d post, %d media, %d gagal.\n",
	$jatman_stats['posts']['created'] + $jatman_stats['posts']['updated'],
	$jatman_stats['media']['created'] + $jatman_stats['media']['reused'],
	count( $jatman_stats['failed'] )
);
foreach ( $jatman_stats['failed'] as $jatman_fail ) {
	echo "Gagal: $jatman_fail\n";
}
