<?php
/**
 * Impor sample ke WordPress lokal. Jalankan: npm run sample:import (setelah npm run sample:fetch).
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}
require_once ABSPATH . 'tools/importer/class-jatman-importer.php';

$jatman_base = ABSPATH . 'tools/sample/data';
if ( ! is_readable( "$jatman_base/posts.json" ) ) {
	WP_CLI::error( 'tools/sample/data/posts.json belum ada. Jalankan dulu: npm run sample:fetch' );
}
$jatman_data     = json_decode( file_get_contents( "$jatman_base/posts.json" ), true, 512, JSON_THROW_ON_ERROR );
$jatman_importer = new Jatman_Importer( $jatman_base );
$jatman_stats    = $jatman_importer->run( $jatman_data );
foreach ( require ABSPATH . 'tools/sample/pages.php' as $jatman_page ) {
	$jatman_importer->upsert_page( $jatman_page );
}
flush_rewrite_rules( false ); // slug post baru bisa bentrok dengan path kategori

WP_CLI::log( sprintf( 'Penulis: %d dibuat, %d diperbarui', $jatman_stats['authors']['created'], $jatman_stats['authors']['updated'] ) );
WP_CLI::log( sprintf( 'Post: %d dibuat, %d diperbarui', $jatman_stats['posts']['created'], $jatman_stats['posts']['updated'] ) );
WP_CLI::log( sprintf( 'Media: %d diunggah, %d dipakai ulang', $jatman_stats['media']['created'], $jatman_stats['media']['reused'] ) );
foreach ( $jatman_stats['failed'] as $jatman_fail ) {
	WP_CLI::warning( $jatman_fail );
}
WP_CLI::success(
	sprintf(
		'%d post masuk, %d gagal.',
		$jatman_stats['posts']['created'] + $jatman_stats['posts']['updated'],
		count( $jatman_stats['failed'] )
	)
);
