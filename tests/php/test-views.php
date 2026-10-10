<?php
jatman_ensure_categories();
$jt_v_ids = [];
try {
	$one = wp_insert_post( [ 'post_title' => 'jt populer satu', 'post_status' => 'publish', 'post_date' => '2026-01-02 08:00:00' ] );
	$two = wp_insert_post( [ 'post_title' => 'jt populer dua', 'post_status' => 'publish', 'post_date' => '2026-01-03 08:00:00' ] );
	$jt_v_ids = [ $one, $two ];

	jt_same( 0, jatman_views( $one ), 'post baru punya 0 pembaca' );

	$_SERVER['REMOTE_ADDR'] = '203.0.113.7';
	$req = new WP_REST_Request( 'POST', "/jatman/v1/views/$one" );
	$res = rest_do_request( $req );
	jt_same( 200, $res->get_status(), 'endpoint penghitung menjawab 200' );
	jt_same( 1, jatman_views( $one ), 'kunjungan pertama dihitung' );
	rest_do_request( new WP_REST_Request( 'POST', "/jatman/v1/views/$one" ) );
	jt_same( 1, jatman_views( $one ), 'kunjungan ulang dari IP yang sama dalam 30 menit tidak dihitung' );
	$_SERVER['REMOTE_ADDR'] = '203.0.113.8';
	rest_do_request( new WP_REST_Request( 'POST', "/jatman/v1/views/$one" ) );
	jt_same( 2, jatman_views( $one ), 'IP lain dihitung' );

	jt_same( 404, rest_do_request( new WP_REST_Request( 'POST', '/jatman/v1/views/99999999' ) )->get_status(), 'post tak ada → 404' );
	$draft = wp_insert_post( [ 'post_title' => 'jt draf', 'post_status' => 'draft' ] );
	$jt_v_ids[] = $draft;
	jt_same( 404, rest_do_request( new WP_REST_Request( 'POST', "/jatman/v1/views/$draft" ) )->get_status(), 'draf tidak bisa dihitung' );

	$GLOBALS['jatman_seen'] = [];
	$popular = jatman_render_post_list( [ 'layout' => 'compact', 'popular' => true, 'count' => 50, 'title' => 'Terpopuler' ] );
	$pos1 = strpos( $popular, 'jt populer satu' );
	$pos2 = strpos( $popular, 'jt populer dua' );
	jt_assert( false !== $pos1 && false !== $pos2 && $pos1 < $pos2, 'Terpopuler: lebih banyak pembaca tampil lebih dulu walau lebih lama' );

	$more = jatman_render_post_list( [ 'layout' => 'list', 'count' => 1, 'title' => 'Terbaru', 'moreUrl' => '/indeks/' ] );
	jt_assert( str_contains( $more, 'href="' . home_url( '/indeks/' ) . '"' ), 'moreUrl menghasilkan tautan Lihat semua ke indeks' );
} finally {
	foreach ( $jt_v_ids as $id ) {
		wp_delete_post( $id, true );
	}
}
