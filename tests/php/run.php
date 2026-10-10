<?php
/**
 * Runner tes PHP mini, dijalankan di environment tests milik wp-env (port 8889, database terpisah).
 * Jalankan: npm run test:php   (filter: npx wp-env run tests-cli wp eval-file tests/php/run.php urls)
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}

$GLOBALS['jt_results'] = [ 'pass' => 0, 'fail' => [] ];

function jt_assert( bool $cond, string $msg ): void {
	if ( $cond ) {
		$GLOBALS['jt_results']['pass']++;
	} else {
		$GLOBALS['jt_results']['fail'][] = $msg;
	}
}

function jt_same( $expected, $actual, string $msg ): void {
	jt_assert( $expected === $actual, $msg . ' — expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ) );
}

$jt_filter = $args[0] ?? '';
foreach ( glob( __DIR__ . '/test-*.php' ) as $jt_file ) {
	if ( $jt_filter && ! str_contains( basename( $jt_file ), $jt_filter ) ) {
		continue;
	}
	WP_CLI::log( '• ' . basename( $jt_file ) );
	try {
		require $jt_file;
	} catch ( Throwable $e ) {
		$GLOBALS['jt_results']['fail'][] = basename( $jt_file ) . ': ' . get_class( $e ) . ': ' . $e->getMessage();
	}
}

$jt_r = $GLOBALS['jt_results'];
foreach ( $jt_r['fail'] as $jt_fail ) {
	WP_CLI::warning( $jt_fail );
}
if ( $jt_r['fail'] ) {
	WP_CLI::error( sprintf( '%d lulus, %d gagal', $jt_r['pass'], count( $jt_r['fail'] ) ) );
}
WP_CLI::success( sprintf( '%d lulus', $jt_r['pass'] ) );
