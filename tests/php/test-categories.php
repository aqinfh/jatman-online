<?php
$ids = jatman_ensure_categories();
jt_same( count( jatman_categories() ), count( $ids ), 'semua kategori dibuat' );
jt_same( $ids['berita'], (int) get_term( $ids['nasional'], 'category' )->parent, 'nasional anak dari berita' );
jt_same( 0, (int) get_term( $ids['dawuh'], 'category' )->parent, 'dawuh kategori akar' );

// Idempotent: dipanggil ulang tidak menduplikasi dan tidak menimpa deskripsi hasil edit redaksi.
wp_update_term( $ids['hikmah'], 'category', [ 'description' => 'Diubah redaksi' ] );
jt_same( $ids, jatman_ensure_categories(), 'ID kategori stabil saat dipanggil ulang' );
jt_same( 'Diubah redaksi', get_term( $ids['hikmah'], 'category' )->description, 'deskripsi redaksi tidak ditimpa' );
wp_update_term( $ids['hikmah'], 'category', [ 'description' => jatman_categories()['hikmah'][2] ] );

$dawuh_post = wp_insert_post( [ 'post_title' => 'jt dawuh', 'post_status' => 'publish', 'post_category' => [ $ids['dawuh'] ] ] );
$news_post  = wp_insert_post( [ 'post_title' => 'jt news', 'post_status' => 'publish', 'post_category' => [ $ids['nasional'] ] ] );
try {
	jt_assert( jatman_is_teduh( $dawuh_post ), 'post dawuh = rubrik teduh' );
	jt_assert( ! jatman_is_teduh( $news_post ), 'post nasional bukan rubrik teduh' );
} finally {
	wp_delete_post( $dawuh_post, true );
	wp_delete_post( $news_post, true );
}
