<?php
$jt_sent = [];
$jt_capture = static function ( $short, $atts ) use ( &$jt_sent ) { $jt_sent[] = $atts; return true; };
add_filter( 'pre_wp_mail', $jt_capture, 10, 2 );
delete_transient( 'jatman_kontak_' . md5( '203.0.113.50' ) );
try {
	$valid = [ 'nama' => 'Ahmad', 'email' => 'ahmad@example.com', 'pesan' => 'Assalamualaikum, saya ingin bertanya.', 'setuju' => '1', 'website' => '' ];
	jt_same( 'invalid', jatman_handle_contact( array_merge( $valid, [ 'email' => 'bukan-email' ] ), '203.0.113.50' ), 'email tidak valid ditolak' );
	jt_same( 'invalid', jatman_handle_contact( array_merge( $valid, [ 'setuju' => '' ] ), '203.0.113.50' ), 'tanpa persetujuan ditolak' );
	jt_same( 'terkirim', jatman_handle_contact( array_merge( $valid, [ 'website' => 'http://spam' ] ), '203.0.113.51' ), 'honeypot terisi: pura-pura terkirim' );
	jt_same( 0, count( $jt_sent ), 'honeypot tidak mengirim email' );
	jt_same( 'terkirim', jatman_handle_contact( $valid, '203.0.113.50' ), 'pesan valid terkirim' );
	jt_same( 1, count( $jt_sent ), 'satu email terkirim' );
	jt_same( 'redaksi@jatman.or.id', $jt_sent[0]['to'] ?? null, 'email ke redaksi' );
	jt_assert( str_contains( implode( "\n", (array) ( $jt_sent[0]['headers'] ?? [] ) ), 'Reply-To: Ahmad <ahmad@example.com>' ), 'Reply-To ke pengirim' );
	jt_same( 'terlalu-cepat', jatman_handle_contact( $valid, '203.0.113.50' ), 'pesan kedua dalam semenit ditahan' );
	$form = do_shortcode( '[jatman_kontak]' );
	foreach ( [ 'name="nama"', 'name="email"', 'name="pesan"', 'name="setuju"', 'name="website"', 'action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"' ] as $needle ) {
		jt_assert( str_contains( $form, $needle ), "formulir memuat $needle" );
	}
} finally {
	remove_filter( 'pre_wp_mail', $jt_capture, 10 );
	delete_transient( 'jatman_kontak_' . md5( '203.0.113.50' ) );
}
