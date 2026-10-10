<?php
/**
 * Formulir Kontak ([jatman_kontak]) pengganti formulir web lama: nama, email, pesan, persetujuan
 * Syarat & Ketentuan. Dikirim lewat email ke redaksi. Anti-spam: nonce, honeypot, 1 pesan/menit/IP.
 */

defined( 'ABSPATH' ) || exit;

const JATMAN_CONTACT_EMAIL = 'redaksi@jatman.or.id';

/**
 * Proses kiriman formulir. Mengembalikan status: terkirim | invalid | terlalu-cepat | gagal.
 *
 * @param array<string, string> $data Isian formulir (sudah di-unslash).
 */
function jatman_handle_contact( array $data, string $ip ): string {
	// Honeypot terisi = bot: pura-pura berhasil supaya bot tidak mencoba ulang.
	if ( '' !== trim( (string) ( $data['website'] ?? '' ) ) ) {
		return 'terkirim';
	}
	$name    = sanitize_text_field( (string) ( $data['nama'] ?? '' ) );
	$email   = sanitize_email( (string) ( $data['email'] ?? '' ) );
	$message = sanitize_textarea_field( (string) ( $data['pesan'] ?? '' ) );
	if ( '' === $name || ! is_email( $email ) || mb_strlen( $message ) < 5 || mb_strlen( $message ) > 5000 || empty( $data['setuju'] ) ) {
		return 'invalid';
	}
	$key = 'jatman_kontak_' . md5( $ip );
	if ( get_transient( $key ) ) {
		return 'terlalu-cepat';
	}
	set_transient( $key, 1, MINUTE_IN_SECONDS );

	// Nama di header tanpa karakter pemisah alamat, supaya tidak bisa menyisipkan penerima Reply-To lain.
	$header_name = trim( preg_replace( '/[,;:<>"\\\\()\[\]]+/', ' ', $name ) );
	$sent        = wp_mail(
		JATMAN_CONTACT_EMAIL,
		'[JATMAN Online] Pesan dari ' . $name,
		$message . "\n\n—\n" . $name . ' <' . $email . '>',
		[ 'Reply-To: ' . $header_name . ' <' . $email . '>' ]
	);
	return $sent ? 'terkirim' : 'gagal';
}

/**
 * Isian POST mentah → string ter-unslash (sekali). Nilai non-string (array) dikosongkan.
 *
 * @return array<string, string>
 */
function jatman_contact_fields( array $raw ): array {
	return array_map( static fn( $v ) => is_string( $v ) ? wp_unslash( $v ) : '', $raw );
}

add_action( 'admin_post_nopriv_jatman_kontak', 'jatman_contact_submit' );
add_action( 'admin_post_jatman_kontak', 'jatman_contact_submit' );

function jatman_contact_submit(): void {
	$back = wp_get_referer() ?: home_url( '/kontak/' );
	if ( ! isset( $_POST['_jatman_kontak'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_jatman_kontak'] ) ), 'jatman_kontak' ) ) {
		wp_safe_redirect( add_query_arg( 'kontak', 'invalid', $back ) . '#kontak' );
		exit;
	}
	$data   = jatman_contact_fields( $_POST ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- disanitasi di jatman_handle_contact().
	$status = jatman_handle_contact( $data, function_exists( 'jatman_client_ip' ) ? jatman_client_ip() : (string) ( $_SERVER['REMOTE_ADDR'] ?? '' ) );
	wp_safe_redirect( add_query_arg( 'kontak', $status, remove_query_arg( 'kontak', $back ) ) . '#kontak' );
	exit;
}

add_shortcode(
	'jatman_kontak',
	static function (): string {
		$messages = [
			'terkirim'      => [ 'ok', 'Terima kasih, pesan Anda sudah terkirim ke redaksi.' ],
			'invalid'       => [ 'error', 'Mohon lengkapi nama, email yang valid, pesan (minimal 5 karakter), dan centang persetujuan.' ],
			'terlalu-cepat' => [ 'error', 'Pesan sebelumnya baru saja terkirim. Silakan coba lagi sebentar lagi.' ],
			'gagal'         => [ 'error', 'Maaf, pesan belum bisa terkirim. Silakan kirim langsung ke ' . JATMAN_CONTACT_EMAIL . '.' ],
		];
		$status = isset( $_GET['kontak'] ) ? sanitize_key( wp_unslash( $_GET['kontak'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		$notice = isset( $messages[ $status ] )
			? sprintf( '<p class="jm-form__notice jm-form__notice--%s" role="status">%s</p>', esc_attr( $messages[ $status ][0] ), esc_html( $messages[ $status ][1] ) )
			: '';
		ob_start();
		?>
		<form id="kontak" class="jm-form" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
			<h2 class="jm-form__title">Kirim pesan</h2>
			<?php echo $notice; // phpcs:ignore WordPress.Security.EscapeOutput -- di-escape di atas. ?>
			<input type="hidden" name="action" value="jatman_kontak">
			<?php wp_nonce_field( 'jatman_kontak', '_jatman_kontak', false ); ?>
			<p class="jm-form__field"><label for="jm-kontak-nama">Nama</label><input id="jm-kontak-nama" type="text" name="nama" maxlength="200" required autocomplete="name"></p>
			<p class="jm-form__field"><label for="jm-kontak-email">Email</label><input id="jm-kontak-email" type="email" name="email" maxlength="200" required autocomplete="email"></p>
			<p class="jm-form__field"><label for="jm-kontak-pesan">Pesan</label><textarea id="jm-kontak-pesan" name="pesan" rows="6" minlength="5" maxlength="5000" required></textarea></p>
			<p class="jm-form__hp" aria-hidden="true"><label for="jm-kontak-website">Website</label><input id="jm-kontak-website" type="text" name="website" tabindex="-1" autocomplete="off"></p>
			<p class="jm-form__check"><input id="jm-kontak-setuju" type="checkbox" name="setuju" value="1" required><label for="jm-kontak-setuju">Saya telah membaca dan setuju dengan <a href="<?php echo esc_url( home_url( '/terms-conditions/' ) ); ?>">Syarat &amp; Ketentuan</a></label></p>
			<p><button type="submit" class="jm-button jm-button--solid">Kirim pesan</button></p>
		</form>
		<?php
		return (string) ob_get_clean();
	}
);
