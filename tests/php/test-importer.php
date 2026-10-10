<?php
require_once ABSPATH . 'tools/importer/class-jatman-importer.php';

Jatman_Importer::purge();
$base        = ABSPATH . 'tests/fixtures/import';
$data        = json_decode( file_get_contents( "$base/posts.json" ), true, 512, JSON_THROW_ON_ERROR );
$count_media = static fn(): int => count( get_posts( [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => -1, 'fields' => 'ids' ] ) );

try {
	$first = ( new Jatman_Importer( $base ) )->run( $data );
	jt_same( 2, $first['posts']['created'], 'dua post valid dibuat' );
	jt_same( 1, count( $first['failed'] ), 'post berkategori tak dikenal dicatat gagal' );
	jt_assert( str_contains( $first['failed'][0] ?? '', 'tidak-ada' ), 'pesan gagal menyebut kategorinya' );

	$post = get_page_by_path( 'jt-post-satu', OBJECT, 'post' );
	jt_assert( $post instanceof WP_Post, 'post ditemukan lewat slug' );
	jt_same( 'Post Satu & Dua', $post->post_title, 'judul apa adanya' );
	jt_same( '2026-10-04 07:33:10', $post->post_date, 'tanggal terbit asli' );
	jt_same( 'Ringkasan satu.', $post->post_excerpt, 'ringkasan' );
	jt_same( [ 'nasional' ], wp_list_pluck( get_the_category( $post->ID ), 'slug' ), 'kategori' );
	jt_same( [ 'Harlah', 'Jatman' ], wp_list_pluck( wp_get_post_tags( $post->ID, [ 'orderby' => 'name' ] ), 'name' ), 'tag' );
	jt_assert( str_contains( $post->post_content, '\\\\' ), 'backslash di isi tidak hilang' );
	jt_assert( ! str_contains( $post->post_content, 'example.test/isi.jpg' ), 'URL gambar isi diganti' );
	jt_assert( str_contains( $post->post_content, '/wp-content/uploads/' ), 'gambar isi menunjuk ke uploads lokal' );

	$thumb = (int) get_post_thumbnail_id( $post );
	jt_assert( $thumb > 0, 'gambar utama terpasang' );
	jt_same( 'Keterangan foto', wp_get_attachment_caption( $thumb ), 'caption gambar utama' );
	jt_same( 'Alt utama', get_post_meta( $thumb, '_wp_attachment_image_alt', true ), 'alt gambar utama' );
	jt_assert( is_sticky( $post->ID ), 'flag sticky' );
	$jt_imported_author = get_user_by( 'slug', 'jt-penulis-a' );
	jt_assert( $jt_imported_author && 'jt-penulis-a' !== $jt_imported_author->user_login, 'username login penulis bukan slug profil publik' );
	jt_same( '1', get_post_meta( $post->ID, 'jatman_pilihan', true ), 'flag pilihan' );
	jt_same( 120, jatman_views( $post->ID ), 'jumlah pembaca dari sumber ikut diimpor' );

	$author = get_user_by( 'slug', 'jt-penulis-a' );
	jt_same( 'Penulis A', $author->display_name, 'nama penulis' );
	jt_same( 'Bio A', $author->description, 'bio penulis' );
	jt_assert( (int) get_user_meta( $author->ID, 'jatman_avatar_id', true ) > 0, 'foto penulis' );
	jt_same( $author->ID, (int) $post->post_author, 'post milik penulis' );
	jt_same( 0, (int) get_post_thumbnail_id( get_page_by_path( 'jt-post-dua', OBJECT, 'post' ) ), 'post tanpa gambar tetap masuk' );

	$media_before = $count_media();
	$second       = ( new Jatman_Importer( $base ) )->run( $data );
	jt_same( 0, $second['posts']['created'], 'impor ulang tidak membuat post baru' );
	jt_same( 2, $second['posts']['updated'], 'impor ulang memperbarui post' );
	jt_same( 0, $second['media']['created'], 'impor ulang tidak mengunggah ulang media' );
	jt_same( $media_before, $count_media(), 'jumlah media tetap' );
	jt_same( 1, count( get_users( [ 'meta_key' => 'jatman_imported' ] ) ), 'penulis tidak terduplikasi' );

	$data['posts'][0]['flags'] = [];
	( new Jatman_Importer( $base ) )->run( $data );
	jt_assert( ! is_sticky( $post->ID ), 'sticky dicabut bila flag hilang' );
	jt_assert( ! get_post_meta( $post->ID, 'jatman_pilihan', true ), 'pilihan dicabut bila flag hilang' );
} finally {
	Jatman_Importer::purge();
}
jt_assert( null === get_page_by_path( 'jt-post-satu', OBJECT, 'post' ), 'purge menghapus post sample' );
jt_same( 0, count( get_users( [ 'meta_key' => 'jatman_imported' ] ) ), 'purge menghapus penulis sample' );
