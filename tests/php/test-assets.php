<?php
// Versi aset = waktu ubah file, supaya browser/CDN selalu mengambil CSS/JS terbaru setelah ada perubahan.
do_action( 'wp_enqueue_scripts' );
foreach ( [ [ wp_styles(), 'jatman', 'assets/css/main.css' ], [ wp_scripts(), 'jatman', 'assets/js/theme.js' ] ] as [ $deps, $handle, $file ] ) {
	jt_same( (string) filemtime( get_theme_file_path( $file ) ), $deps->registered[ $handle ]->ver ?? null, "versi $file mengikuti waktu ubah file" );
}
