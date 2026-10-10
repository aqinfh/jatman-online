<?php
$ids  = jatman_ensure_categories();
$post = wp_insert_post( [
	'post_title'    => "Jam'iyyah & Thariqah",
	'post_status'   => 'publish',
	'post_excerpt'  => 'Ringkasan & dek',
	'post_content'  => '<!-- wp:paragraph --><p>Isi.</p><!-- /wp:paragraph -->',
	'post_category' => [ $ids['berita'], $ids['nasional'] ],
] );
try {
	$crumb = jatman_render_breadcrumb( $post );
	preg_match_all( '#<a href="[^"]+">([^<]+)</a>#', $crumb, $m );
	jt_same( [ 'Beranda', 'Berita', 'Nasional' ], $m[1], 'breadcrumb: Beranda › Berita › Nasional' );

	jt_same( '<p class="jm-dek">Ringkasan &amp; dek</p>', jatman_render_dek( $post ), 'dek dari ringkasan, di-escape sekali' );
	wp_update_post( [ 'ID' => $post, 'post_excerpt' => '' ] );
	jt_same( '', jatman_render_dek( $post ), 'tanpa ringkasan manual → dek tidak tampil' );

	$links = jatman_share_links( $post );
	jt_same( [ 'WhatsApp', 'Facebook', 'X', 'Telegram' ], array_keys( $links ), 'empat tujuan share' );
	jt_assert( str_contains( $links['WhatsApp'], 'Jam%E2%80%99iyyah%20%26%20Thariqah' ), 'judul di URL share di-decode lalu di-encode sekali' );
	jt_assert( ! str_contains( $links['X'], '%26%23' ), 'tidak ada entitas HTML di URL share' );

	$byline = jatman_render_byline( $post );
	jt_assert( str_contains( $byline, '1 menit baca' ), 'byline memuat waktu baca' );
	jt_assert( (bool) preg_match( '/\d{2}:\d{2} WIB/', $byline ), 'byline memuat jam WIB' );
	jt_same( '', jatman_render_featured_figure( $post, '' ), 'tanpa gambar utama → figure tidak dirender' );
} finally {
	wp_delete_post( $post, true );
}
