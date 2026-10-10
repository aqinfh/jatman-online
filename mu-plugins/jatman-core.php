<?php
/**
 * Plugin Name: JATMAN Core
 * Description: Aturan konten JATMAN Online (kategori, URL lama, penulis, Pilihan Redaksi). Tetap berlaku walau tema diganti.
 */

defined( 'ABSPATH' ) || exit;

foreach ( glob( __DIR__ . '/jatman-core/*.php' ) as $jatman_core_file ) {
	require_once $jatman_core_file;
}
