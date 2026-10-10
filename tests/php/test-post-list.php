<?php
jatman_ensure_categories();
$jt_cat  = static fn( string $slug ): int => (int) get_term_by( 'slug', $slug, 'category' )->term_id;
$jt_ids  = [];
$jt_make = static function ( string $title, array $cats, string $date, string $excerpt = '' ) use ( $jt_cat, &$jt_ids ): int {
	$id = wp_insert_post( [
		'post_title'    => $title,
		'post_status'   => 'publish',
		'post_content'  => '<!-- wp:paragraph --><p>Isi singkat.</p><!-- /wp:paragraph -->',
		'post_excerpt'  => $excerpt,
		'post_date'     => $date,
		'post_category' => array_map( $jt_cat, $cats ),
	] );
	$jt_ids[] = $id;
	return $id;
};

try {
	$GLOBALS['jatman_seen'] = [];
	jt_same( '', jatman_render_post_list( [ 'layout' => 'cards', 'category' => 'hikmah', 'title' => 'Hikmah' ] ), 'rubrik kosong tidak dirender sama sekali' );

	$a = $jt_make( "Jam'iyyah & Thariqah", [ 'berita', 'nasional' ], '2026-10-05 08:00:00', 'Ringkasan "kutip" & dan' );
	$b = $jt_make( 'Kabar Daerah', [ 'daerah' ], '2026-10-04 08:00:00' );
	$c = $jt_make( 'Hikmah Pagi', [ 'hikmah' ], '2026-10-03 08:00:00' );
	$d = $jt_make( 'Dawuh Kiai', [ 'dawuh' ], '2026-10-02 08:00:00', 'Ilmu itu cahaya.' );
	stick_post( $b );

	$GLOBALS['jatman_seen'] = [];
	$hero      = jatman_render_post_list( [ 'layout' => 'hero' ] );
	$hero_main = explode( 'jm-hero__side', explode( 'jm-hero__main', $hero )[1] ?? '' )[0];
	jt_assert( str_contains( $hero_main, 'Kabar Daerah' ), 'post sticky jadi berita utama hero' );
	jt_assert( str_contains( $hero, 'Jam&#8217;iyyah &#038; Thariqah' ), 'judul dengan apostrof & ampersand ter-escape sekali' );
	jt_assert( ! str_contains( $hero, '&amp;amp;' ) && ! str_contains( $hero, '&amp;#' ), 'tidak ada escape ganda' );

	$latest = jatman_render_post_list( [ 'layout' => 'list', 'count' => 8, 'dedupe' => true, 'title' => 'Terbaru' ] );
	foreach ( [ 'Kabar Daerah', 'Hikmah Pagi', 'Dawuh Kiai' ] as $t ) {
		jt_assert( ! str_contains( $latest, $t ), "Terbaru tidak mengulang '$t' dari hero" );
	}

	update_post_meta( $c, 'jatman_pilihan', true );
	$pilihan = jatman_render_post_list( [ 'layout' => 'compact', 'pilihan' => true, 'count' => 5, 'title' => 'Pilihan Redaksi' ] );
	jt_assert( str_contains( $pilihan, 'Hikmah Pagi' ) && ! str_contains( $pilihan, 'Kabar Daerah' ), 'Pilihan Redaksi hanya post bertanda' );

	$cards = jatman_render_post_list( [ 'layout' => 'cards', 'category' => 'hikmah,dawuh', 'count' => 4, 'title' => 'Hikmah' ] );
	jt_assert( str_contains( $cards, 'Hikmah Pagi' ) && str_contains( $cards, 'Dawuh Kiai' ), 'kategori dipisah koma = gabungan' );
	jt_assert( ! str_contains( $cards, 'jm-card__media' ), 'post tanpa gambar utama tidak merender wadah gambar' );

	$quote = jatman_render_post_list( [ 'layout' => 'quote', 'category' => 'dawuh', 'count' => 1, 'title' => 'Dawuh', 'band' => 'cream' ] );
	jt_assert( str_contains( $quote, 'Ilmu itu cahaya.' ) && str_contains( $quote, 'jm-band--cream' ), 'kutipan Dawuh dari ringkasan, di pita krem' );
	jt_assert( str_contains( $quote, 'Lihat semua<span class="screen-reader-text"> Dawuh</span>' ), 'tautan Lihat semua punya nama yang jelas' );

	$regions = jatman_render_post_list( [ 'layout' => 'regions', 'category' => 'nasional,daerah,internasional', 'count' => 4, 'title' => 'Berita' ] );
	jt_assert( str_contains( $regions, '>Nasional<' ) && str_contains( $regions, '>Daerah<' ), 'kolom wilayah berisi tampil' );
	jt_assert( ! str_contains( $regions, '>Internasional<' ), 'kolom wilayah kosong tidak dirender' );

	jt_same( 'nasional', jatman_primary_category( get_post( $a ) )->slug, 'kategori utama = anak terdalam' );
	jt_same( 1, jatman_reading_time( get_post( $a ) ), 'waktu baca minimal 1 menit' );
	$long = $jt_make( 'Panjang', [ 'artikel' ], '2026-01-01 08:00:00' );
	wp_update_post( [ 'ID' => $long, 'post_content' => str_repeat( 'kata ', 450 ) ] );
	jt_same( 3, jatman_reading_time( get_post( $long ) ), '450 kata = 3 menit' );
} finally {
	foreach ( $jt_ids as $id ) {
		unstick_post( $id );
		wp_delete_post( $id, true );
	}
}
