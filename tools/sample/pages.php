<?php
/**
 * Halaman statis sample. Teks Tentang adalah draf yang perlu ditinjau redaksi.
 *
 * @return array<int, array{slug: string, title: string, content: string}>
 */

$jatman_placeholder = static fn( string $what ): string =>
	"<!-- wp:paragraph -->\n<p>Isi halaman $what akan dipindahkan dari web lama saat migrasi.</p>\n<!-- /wp:paragraph -->";

// Isi Kontak, Kirim Tulisan, dan Syarat & Ketentuan diambil dari web lama oleh fetch.mjs (data/pages.json).
$jatman_old_file  = __DIR__ . '/data/pages.json';
$jatman_old_pages = is_readable( $jatman_old_file ) ? json_decode( (string) file_get_contents( $jatman_old_file ), true ) : [];
$jatman_old       = static fn( string $slug, string $label ): string => $jatman_old_pages[ $slug ]['content'] ?? $jatman_placeholder( $label );

return [
	[
		'slug'    => 'tentang',
		'title'   => 'Tentang JATMAN',
		'content' => implode(
			"\n\n",
			[
				"<!-- wp:paragraph -->\n<p>Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah (JATMAN) merupakan organisasi keagamaan yang menjadi wadah para pengamal ajaran at-thariqah al-mu’tabarah, sekaligus badan otonom Nahdlatul Ulama.</p>\n<!-- /wp:paragraph -->",
				"<!-- wp:paragraph -->\n<p>JATMAN lahir dari Kongres Alim Ulama Ahli Thariqah di Tegalrejo, Magelang. Berdasarkan kajian Idarah Aliyyah atas manuskrip <em>Risālah Al-Mu’tamar Al-Awwal</em>, Hari Lahir JATMAN ditetapkan pada 13 Oktober 1957.</p>\n<!-- /wp:paragraph -->",
				"<!-- wp:paragraph -->\n<p>JATMAN mengamalkan dan menyebarkan ajaran Ahlussunnah wal Jama’ah dalam syari’ah, thariqah, haqiqah, dan ma’rifah dalam bingkai Negara Kesatuan Republik Indonesia.</p>\n<!-- /wp:paragraph -->",
				"<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">JATMAN Online</h2>\n<!-- /wp:heading -->",
				"<!-- wp:paragraph -->\n<p>JATMAN Online adalah media informasi resmi JATMAN yang dikelola tim LTN JATMAN.</p>\n<!-- /wp:paragraph -->",
			]
		),
	],
	[
		'slug'    => 'indeks',
		'title'   => 'Indeks Berita',
		'excerpt' => 'Semua tulisan JATMAN Online, dari yang terbaru.',
		'content' => '',
	],
	[ 'slug' => 'kontak', 'title' => 'Kontak', 'content' => $jatman_old( 'kontak', 'Kontak' ) ],
	[ 'slug' => 'kirim-tulisan', 'title' => 'Kirim Tulisan JATMAN Online', 'content' => $jatman_old( 'kirim-tulisan', 'Kirim Tulisan' ) ],
	[ 'slug' => 'terms-conditions', 'title' => 'Syarat & Ketentuan', 'content' => $jatman_old( 'terms-conditions', 'Syarat & Ketentuan' ) ],
];
