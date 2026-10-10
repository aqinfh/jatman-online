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

	// Di balik proxy/CDN: IP klien diambil dari header tepercaya, bukan REMOTE_ADDR milik proxy.
	if ( ! defined( 'JATMAN_CLIENT_IP_HEADER' ) ) {
		define( 'JATMAN_CLIENT_IP_HEADER', 'HTTP_CF_CONNECTING_IP' );
	}
	$proxied    = wp_insert_post( [ 'post_title' => 'jt via proxy', 'post_status' => 'publish', 'post_date' => '2025-01-01 08:00:00' ] );
	$jt_v_ids[] = $proxied;
	$_SERVER['REMOTE_ADDR'] = '198.51.100.1'; // IP proxy, sama untuk semua pembaca
	foreach ( [ '203.0.113.20', '203.0.113.21' ] as $jt_ip ) {
		$_SERVER['HTTP_CF_CONNECTING_IP'] = $jt_ip;
		rest_do_request( new WP_REST_Request( 'POST', "/jatman/v1/views/$proxied" ) );
	}
	jt_same( 2, jatman_views( $proxied ), 'dua pembaca di balik proxy yang sama dihitung terpisah' );
	$_SERVER['HTTP_CF_CONNECTING_IP'] = 'bukan-ip';
	jt_same( '198.51.100.1', jatman_client_ip(), 'header berisi nilai bukan IP diabaikan' );
	unset( $_SERVER['HTTP_CF_CONNECTING_IP'] );

	jt_same( 404, rest_do_request( new WP_REST_Request( 'POST', '/jatman/v1/views/99999999' ) )->get_status(), 'post tak ada → 404' );
	$draft = wp_insert_post( [ 'post_title' => 'jt draf', 'post_status' => 'draft' ] );
	$jt_v_ids[] = $draft;
	jt_same( 404, rest_do_request( new WP_REST_Request( 'POST', "/jatman/v1/views/$draft" ) )->get_status(), 'draf tidak bisa dihitung' );

	// Post tanpa hitungan tapi dengan meta lain bernilai besar tidak boleh naik ke atas.
	$three = wp_insert_post( [ 'post_title' => 'jt populer tiga', 'post_status' => 'publish', 'post_date' => '2026-01-04 08:00:00' ] );
	$jt_v_ids[] = $three;
	global $wpdb;
	$wpdb->delete( $wpdb->postmeta, [ 'post_id' => $three ] ); // satu-satunya meta: nilai besar non-views
	update_post_meta( $three, '_edit_lock', '1760000000:1' );

	$GLOBALS['jatman_seen'] = [];
	$popular = jatman_render_post_list( [ 'layout' => 'compact', 'popular' => true, 'count' => 50, 'title' => 'Terpopuler' ] );
	$pos3 = strpos( $popular, 'jt populer tiga' );
	jt_assert( false !== $pos3 && strpos( $popular, 'jt populer satu' ) < $pos3, 'post tanpa hitungan (dengan meta lain) berada di bawah post yang dibaca' );
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
