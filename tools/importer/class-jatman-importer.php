<?php
/**
 * Importer sumber-agnostik. Menerima data ternormalisasi (format tools/sample/data/posts.json)
 * dan meng-upsert penulis, media, serta post. Dipakai sample sekarang dan migrasi Varient nanti:
 * yang berganti hanya penghasil JSON-nya.
 */

defined( 'ABSPATH' ) || exit;

class Jatman_Importer {

	private string $base_dir;

	/** @var array<string, int> */
	private array $category_ids;

	private array $stats = [
		'authors' => [ 'created' => 0, 'updated' => 0 ],
		'posts'   => [ 'created' => 0, 'updated' => 0 ],
		'media'   => [ 'created' => 0, 'reused' => 0 ],
		'failed'  => [],
	];

	public function __construct( string $base_dir ) {
		$this->base_dir = rtrim( $base_dir, '/' );
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		// Konten berasal dari web lama milik sendiri; jangan disaring kses (wp-cli berjalan tanpa user).
		kses_remove_filters();
		$this->category_ids = jatman_ensure_categories();
	}

	public function run( array $data ): array {
		$author_ids = [];
		foreach ( $data['authors'] ?? [] as $slug => $author ) {
			try {
				$author_ids[ $slug ] = $this->upsert_author( $author );
			} catch ( Throwable $e ) {
				$this->stats['failed'][] = "penulis $slug: " . $e->getMessage();
			}
		}
		foreach ( $data['posts'] ?? [] as $post ) {
			try {
				if ( ! isset( $author_ids[ $post['author'] ] ) ) {
					throw new RuntimeException( "penulis '{$post['author']}' tidak tersedia" );
				}
				$this->upsert_post( $post, $author_ids[ $post['author'] ] );
			} catch ( Throwable $e ) {
				$this->stats['failed'][] = 'post ' . ( $post['slug'] ?? '?' ) . ': ' . $e->getMessage();
			}
		}
		return $this->stats;
	}

	public function upsert_author( array $a ): int {
		$user   = get_user_by( 'slug', $a['slug'] );
		$fields = [ 'display_name' => $a['name'], 'nickname' => $a['name'], 'description' => $a['bio'] ?? '' ];
		if ( $user ) {
			$id = wp_update_user( [ 'ID' => $user->ID ] + $fields );
			$this->stats['authors']['updated']++;
		} else {
			$id = wp_insert_user(
				[
					'user_login'    => $a['slug'],
					'user_nicename' => $a['slug'],
					'user_email'    => $a['slug'] . '@jatman.invalid',
					'user_pass'     => wp_generate_password( 32 ),
					'role'          => 'author',
				] + $fields
			);
			$this->stats['authors']['created']++;
		}
		if ( is_wp_error( $id ) ) {
			throw new RuntimeException( $id->get_error_message() );
		}
		update_user_meta( $id, 'jatman_imported', 1 );
		if ( ! empty( $a['avatar']['file'] ) ) {
			update_user_meta( $id, 'jatman_avatar_id', $this->import_media( $a['avatar']['file'], $a['avatar']['url'], 0, $a['name'] ) );
		}
		return (int) $id;
	}

	public function upsert_post( array $p, int $author_id ): int {
		if ( ! isset( $this->category_ids[ $p['category'] ] ) ) {
			throw new RuntimeException( "kategori '{$p['category']}' tidak dikenal" );
		}
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $p['date'] ?? '' ) ) {
			throw new RuntimeException( "tanggal tidak valid: '" . ( $p['date'] ?? '' ) . "'" );
		}
		$existing = get_posts( [ 'name' => $p['slug'], 'post_type' => 'post', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ] );
		$args     = [
			'post_type'      => 'post',
			'post_status'    => 'publish',
			'post_name'      => $p['slug'],
			'post_title'     => $p['title'],
			'post_excerpt'   => $p['excerpt'] ?? '',
			'post_content'   => $p['content'],
			'post_author'    => $author_id,
			'post_date'      => $p['date'],
			'post_date_gmt'  => get_gmt_from_date( $p['date'] ),
			'post_category'  => [ $this->category_ids[ $p['category'] ] ],
			'tags_input'     => $p['tags'] ?? [],
			'comment_status' => 'closed',
			'ping_status'    => 'closed',
		];
		if ( $existing ) {
			$args['ID'] = (int) $existing[0];
		}
		$id = wp_insert_post( wp_slash( $args ), true );
		if ( is_wp_error( $id ) ) {
			throw new RuntimeException( $id->get_error_message() );
		}
		$this->stats['posts'][ $existing ? 'updated' : 'created' ]++;
		update_post_meta( $id, 'jatman_source_url', $p['source_url'] );

		// Gambar di dalam isi: unggah, lalu ganti URL lama dengan URL lokal.
		$replacements = [];
		foreach ( $p['inline_images'] ?? [] as $img ) {
			$replacements[ $img['url'] ] = wp_get_attachment_url( $this->import_media( $img['file'], $img['url'], $id ) );
		}
		if ( $replacements ) {
			wp_update_post( wp_slash( [ 'ID' => $id, 'post_content' => strtr( $p['content'], $replacements ) ] ) );
		}

		if ( ! empty( $p['image']['file'] ) ) {
			$att = $this->import_media( $p['image']['file'], $p['image']['url'], $id, $p['image']['alt'] ?? '' );
			wp_update_post( [ 'ID' => $att, 'post_excerpt' => $p['image']['caption'] ?? '' ] );
			set_post_thumbnail( $id, $att );
		} else {
			delete_post_thumbnail( $id );
		}

		$flags = $p['flags'] ?? [];
		in_array( 'pilihan', $flags, true ) ? update_post_meta( $id, 'jatman_pilihan', true ) : delete_post_meta( $id, 'jatman_pilihan' );
		in_array( 'sticky', $flags, true ) ? stick_post( $id ) : unstick_post( $id );
		if ( isset( $p['views'] ) ) {
			update_post_meta( $id, 'jatman_views', max( 0, (int) $p['views'] ) );
		}
		return (int) $id;
	}

	public function import_media( string $file, string $source_url, int $parent = 0, string $alt = '' ): int {
		$existing = get_posts(
			[
				'post_type'   => 'attachment',
				'post_status' => 'inherit',
				'meta_key'    => 'jatman_source_url',
				'meta_value'  => $source_url,
				'fields'      => 'ids',
				'numberposts' => 1,
			]
		);
		if ( $existing ) {
			$this->stats['media']['reused']++;
			return (int) $existing[0];
		}
		$path = $this->base_dir . '/' . ltrim( $file, '/' );
		if ( ! is_readable( $path ) ) {
			throw new RuntimeException( "file media tidak ada: $file" );
		}
		$tmp = wp_tempnam( basename( $path ) );
		copy( $path, $tmp );
		$id = media_handle_sideload( [ 'name' => basename( $path ), 'tmp_name' => $tmp ], $parent );
		if ( is_wp_error( $id ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			throw new RuntimeException( $id->get_error_message() );
		}
		update_post_meta( $id, 'jatman_source_url', $source_url );
		if ( $alt ) {
			update_post_meta( $id, '_wp_attachment_image_alt', $alt );
		}
		$this->stats['media']['created']++;
		return (int) $id;
	}

	/** @param array{slug: string, title: string, content: string} $page */
	public function upsert_page( array $page ): int {
		$existing = get_page_by_path( $page['slug'], OBJECT, 'page' );
		$args     = [
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_name'    => $page['slug'],
			'post_title'   => $page['title'],
			'post_content' => $page['content'],
			'post_excerpt' => $page['excerpt'] ?? '',
		];
		if ( $existing ) {
			$args['ID'] = $existing->ID;
		}
		$id = wp_insert_post( wp_slash( $args ), true );
		if ( is_wp_error( $id ) ) {
			throw new RuntimeException( $id->get_error_message() );
		}
		update_post_meta( $id, 'jatman_sample_page', 1 );
		return (int) $id;
	}

	/** Hapus semua konten dan penulis hasil impor. */
	public static function purge(): array {
		$ids = get_posts(
			[
				'post_type'   => [ 'post', 'page', 'attachment' ],
				'post_status' => 'any',
				'numberposts' => -1,
				'fields'      => 'ids',
				'meta_query'  => [
					'relation' => 'OR',
					[ 'key' => 'jatman_source_url', 'compare' => 'EXISTS' ],
					[ 'key' => 'jatman_sample_page', 'compare' => 'EXISTS' ],
				],
			]
		);
		foreach ( $ids as $id ) {
			unstick_post( $id );
			'attachment' === get_post_type( $id ) ? wp_delete_attachment( $id, true ) : wp_delete_post( $id, true );
		}
		require_once ABSPATH . 'wp-admin/includes/user.php';
		$users = get_users( [ 'meta_key' => 'jatman_imported', 'fields' => 'ID' ] );
		foreach ( $users as $user_id ) {
			wp_delete_user( (int) $user_id );
		}
		return [ 'content' => count( $ids ), 'authors' => count( $users ) ];
	}
}
