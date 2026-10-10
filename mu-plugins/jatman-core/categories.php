<?php
/**
 * Pohon kategori JATMAN Online. Slug sama dengan web lama (Varient) supaya URL tidak berubah.
 */

defined( 'ABSPATH' ) || exit;

/** Rubrik bernuansa teduh: tampil dengan latar krem dan ornamen emas. */
const JATMAN_TEDUH = [ 'dawuh', 'hikmah', 'pustaka-tasawuf' ];

/**
 * @return array<string, array{0: string, 1: ?string, 2: string}> slug => [nama, slug induk, deskripsi awal]. Induk selalu didaftarkan sebelum anaknya.
 */
function jatman_categories(): array {
	return [
		'berita'          => [ 'Berita', null, 'Kabar terkini seputar JATMAN, thariqah, dan umat.' ],
		'nasional'        => [ 'Nasional', 'berita', 'Kabar JATMAN dan thariqah dari tingkat nasional.' ],
		'daerah'          => [ 'Daerah', 'berita', 'Kabar dari Idarah Wustha dan Idarah Syu’biyyah di daerah.' ],
		'internasional'   => [ 'Internasional', 'berita', 'Jejaring thariqah di mancanegara.' ],
		'tanya-jawab'     => [ 'Tanya Jawab', null, 'Pertanyaan seputar thariqah dan tasawuf beserta jawabannya.' ],
		'pustaka-tasawuf' => [ 'Pustaka Tasawuf', null, 'Kajian dan khazanah tasawuf.' ],
		'artikel'         => [ 'Artikel', null, 'Opini dan tulisan panjang.' ],
		'thariqah'        => [ 'Thariqah', null, 'Mengenal thariqah al-mu’tabarah.' ],
		'dawuh'           => [ 'Dawuh', null, 'Nasihat para masyayikh dan mursyid.' ],
		'tokoh'           => [ 'Tokoh', null, 'Profil ulama dan tokoh thariqah.' ],
		'hikmah'          => [ 'Hikmah', null, 'Renungan dan mutiara hikmah.' ],
	];
}

/**
 * Pastikan semua kategori ada dengan induk yang benar. Deskripsi hanya diisi saat kategori dibuat,
 * supaya hasil edit redaksi tidak tertimpa.
 *
 * @return array<string, int> slug => term_id
 */
function jatman_ensure_categories(): array {
	$ids = [];
	foreach ( jatman_categories() as $slug => [ $name, $parent, $description ] ) {
		$parent_id = $parent ? ( $ids[ $parent ] ?? 0 ) : 0;
		$term      = get_term_by( 'slug', $slug, 'category' );
		if ( $term ) {
			if ( (int) $term->parent !== $parent_id ) {
				wp_update_term( $term->term_id, 'category', [ 'parent' => $parent_id ] );
			}
			$ids[ $slug ] = (int) $term->term_id;
			continue;
		}
		$created = wp_insert_term( $name, 'category', [ 'slug' => $slug, 'parent' => $parent_id, 'description' => $description ] );
		if ( is_wp_error( $created ) ) {
			throw new RuntimeException( "Gagal membuat kategori $slug: " . $created->get_error_message() );
		}
		$ids[ $slug ] = (int) $created['term_id'];
	}
	return $ids;
}

/**
 * Apakah post (atau arsip kategori yang sedang dibuka bila $post null) termasuk rubrik teduh.
 */
function jatman_is_teduh( $post = null ): bool {
	if ( null === $post && is_category() ) {
		$term = get_queried_object();
		return $term instanceof WP_Term && in_array( $term->slug, JATMAN_TEDUH, true );
	}
	$post = get_post( $post );
	if ( ! $post || 'post' !== $post->post_type ) {
		return false;
	}
	return has_category( JATMAN_TEDUH, $post );
}
