<?php
// Versi WordPress tidak diumumkan di <head> maupun feed.
jt_assert( false === has_action( 'wp_head', 'wp_generator' ), 'meta generator tidak dicetak di <head>' );
jt_same( '', apply_filters( 'the_generator', '<generator>https://wordpress.org/?v=7</generator>', 'rss2' ), 'generator kosong di feed' );

// XML-RPC dimatikan (sasaran brute-force system.multicall dan pingback).
jt_same( false, apply_filters( 'xmlrpc_enabled', true ), 'XML-RPC nonaktif' );
jt_same( [], apply_filters( 'xmlrpc_methods', [ 'pingback.ping' => 'x' ] ), 'tidak ada metode XML-RPC' );

// Daftar user lewat REST hanya untuk yang login.
$jt_prev_user = get_current_user_id();
wp_set_current_user( 0 );
$jt_routes = apply_filters( 'rest_endpoints', [ '/wp/v2/users' => [], '/wp/v2/users/(?P<id>[\d]+)' => [], '/wp/v2/posts' => [] ] );
jt_assert( ! isset( $jt_routes['/wp/v2/users'] ) && ! isset( $jt_routes['/wp/v2/users/(?P<id>[\d]+)'] ), 'REST users tertutup untuk pengunjung' );
jt_assert( isset( $jt_routes['/wp/v2/posts'] ), 'REST posts tetap terbuka' );
$jt_admin = get_users( [ 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ] );
wp_set_current_user( (int) $jt_admin[0] );
$jt_routes = apply_filters( 'rest_endpoints', [ '/wp/v2/users' => [] ] );
jt_assert( isset( $jt_routes['/wp/v2/users'] ), 'REST users tetap ada untuk editor yang login' );

// Pilihan Redaksi hanya bisa diatur editor/admin, bukan penulis untuk tulisannya sendiri.
$jt_author = wp_insert_user( [ 'user_login' => 'jt-hard-author', 'user_pass' => wp_generate_password(), 'user_email' => 'jt-hard-author@example.test', 'role' => 'author' ] );
$jt_editor = wp_insert_user( [ 'user_login' => 'jt-hard-editor', 'user_pass' => wp_generate_password(), 'user_email' => 'jt-hard-editor@example.test', 'role' => 'editor' ] );
$jt_post   = wp_insert_post( [ 'post_title' => 'jt hardening', 'post_status' => 'draft', 'post_author' => $jt_author ] );
try {
	wp_set_current_user( $jt_author );
	jt_assert( ! current_user_can( 'edit_post_meta', $jt_post, 'jatman_pilihan' ), 'penulis tidak bisa menandai Pilihan Redaksi' );
	wp_set_current_user( $jt_editor );
	jt_assert( current_user_can( 'edit_post_meta', $jt_post, 'jatman_pilihan' ), 'editor bisa menandai Pilihan Redaksi' );
} finally {
	wp_delete_post( $jt_post, true );
	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_delete_user( $jt_author );
	wp_delete_user( $jt_editor );
	wp_set_current_user( $jt_prev_user );
}

// Jumlah post per bagian dibatasi supaya atribut block tidak bisa memicu query raksasa.
$jt_ppp     = null;
$jt_capture = static function ( WP_Query $q ) use ( &$jt_ppp ): void { $jt_ppp = $q->get( 'posts_per_page' ); };
add_action( 'pre_get_posts', $jt_capture );
jatman_query_posts( [ 'count' => 100000 ] + jatman_post_list_defaults() );
remove_action( 'pre_get_posts', $jt_capture );
jt_assert( is_int( $jt_ppp ) && $jt_ppp <= 20, 'count dibatasi maksimal 20 (dapat ' . var_export( $jt_ppp, true ) . ')' );

// Formulir kontak: nama tidak bisa menyisipkan alamat tambahan di header Reply-To.
$jt_sent = [];
$jt_mail = static function ( $short, $atts ) use ( &$jt_sent ) { $jt_sent[] = $atts; return true; };
add_filter( 'pre_wp_mail', $jt_mail, 10, 2 );
delete_transient( 'jatman_kontak_' . md5( '203.0.113.60' ) );
try {
	jatman_handle_contact( [ 'nama' => 'Budi, "x" <evil@example.test>; z', 'email' => 'budi@example.com', 'pesan' => 'Pesan uji header.', 'setuju' => '1' ], '203.0.113.60' );
	$jt_reply = (string) current( array_filter( (array) ( $jt_sent[0]['headers'] ?? [] ), static fn( $h ) => str_starts_with( $h, 'Reply-To:' ) ) );
	jt_assert( ! preg_match( '/[,;"]|evil@/', $jt_reply ), "Reply-To tanpa alamat sisipan: $jt_reply" );
	jt_assert( str_ends_with( $jt_reply, '<budi@example.com>' ), 'Reply-To tetap ke pengirim' );
} finally {
	remove_filter( 'pre_wp_mail', $jt_mail, 10 );
	delete_transient( 'jatman_kontak_' . md5( '203.0.113.60' ) );
}

// Isian POST di-unslash tepat sekali (backslash yang diketik pengirim tidak hilang).
jt_same( [ 'pesan' => 'C:\\data', 'lain' => '' ], jatman_contact_fields( [ 'pesan' => 'C:\\\\data', 'lain' => [ 'x' ] ] ), 'unslash sekali, nilai non-string dikosongkan' );
