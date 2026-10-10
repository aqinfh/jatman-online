<?php
/**
 * Hapus semua konten & penulis sample. Dipakai oleh npm run sample:reset sebelum impor ulang.
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}
require_once ABSPATH . 'tools/importer/class-jatman-importer.php';

$jatman_purged = Jatman_Importer::purge();
WP_CLI::success( sprintf( '%d konten dan %d penulis sample dihapus.', $jatman_purged['content'], $jatman_purged['authors'] ) );
