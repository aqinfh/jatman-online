<?php
global $wp_rewrite;
jatman_ensure_categories();
flush_rewrite_rules( false );
$rules = get_option( 'rewrite_rules' );

jt_same( 'index.php?category_name=berita/nasional', $rules['berita/nasional/?$'] ?? null, 'rule /berita/nasional/' );
jt_same( 'index.php?category_name=berita/nasional&paged=$matches[1]', $rules['berita/nasional/page/?([0-9]{1,})/?$'] ?? null, 'rule halaman 2 kategori' );
jt_same( 'index.php?category_name=dawuh', $rules['dawuh/?$'] ?? null, 'rule /dawuh/' );
jt_assert( ! isset( $rules['category/(.+?)/?$'] ), 'base /category/ tidak dipakai lagi' );
jt_same( home_url( '/berita/nasional/' ), get_category_link( get_term_by( 'slug', 'nasional', 'category' ) ), 'link kategori tanpa base' );
jt_same( 'profile', $wp_rewrite->author_base, 'base penulis = profile' );

// Post bernama sama dengan kategori: post yang menang, kategori mengalah.
$clash = wp_insert_post( [ 'post_title' => 'Artikel', 'post_name' => 'artikel', 'post_status' => 'publish' ] );
try {
	jt_assert( ! get_option( 'rewrite_rules' ), 'rewrite rules diinvalidasi saat post bentrok disimpan' );
	// WP_Rewrite menumpuk extra_rules_top antar-flush dalam satu proses, jadi periksa output filter
	// secara langsung (di produksi rule dibangun ulang pada request berikutnya).
	jt_assert( ! isset( apply_filters( 'category_rewrite_rules', [] )['artikel/?$'] ), 'kategori artikel mengalah ke post bernama artikel' );
} finally {
	wp_delete_post( $clash, true );
}
jt_assert( isset( apply_filters( 'category_rewrite_rules', [] )['artikel/?$'] ), 'rule kategori artikel kembali setelah post dihapus' );
flush_rewrite_rules( false );

// Bentrok selesai (post diganti nama / dibuang / dihapus) → rule kategori harus dibangun ulang.
foreach ( [ 'rename', 'trash', 'delete' ] as $jt_how ) {
	$clash2 = wp_insert_post( [ 'post_title' => 'Tokoh', 'post_name' => 'tokoh', 'post_status' => 'publish' ] );
	flush_rewrite_rules( false );
	jt_assert( (bool) get_option( 'rewrite_rules' ), "rules terisi sebelum $jt_how" );
	if ( 'rename' === $jt_how ) {
		wp_update_post( [ 'ID' => $clash2, 'post_name' => 'tokoh-baru' ] );
	} elseif ( 'trash' === $jt_how ) {
		wp_trash_post( $clash2 );
	} else {
		wp_delete_post( $clash2, true );
	}
	jt_assert( ! get_option( 'rewrite_rules' ), "rewrite rules diinvalidasi setelah post bentrok di-$jt_how" );
	wp_delete_post( $clash2, true );
}
flush_rewrite_rules( false );
