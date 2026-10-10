<?php
/**
 * Tema JATMAN Online. Logika dipecah per tanggung jawab di inc/.
 */

defined( 'ABSPATH' ) || exit;

foreach ( glob( __DIR__ . '/inc/*.php' ) as $jatman_file ) {
	require_once $jatman_file;
}
