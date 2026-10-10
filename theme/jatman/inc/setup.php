<?php
/**
 * Setup tema: aset, dark mode tanpa kedipan, preload font, ukuran gambar, varian teduh.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'after_setup_theme',
	static function (): void {
		add_theme_support( 'editor-styles' );
		add_editor_style( 'assets/css/main.css' );
		add_image_size( 'jatman-hero', 1240, 700, true );
		add_image_size( 'jatman-hero-sm', 640, 361, true ); // rasio sama dengan jatman-hero → masuk srcset di HP
		add_image_size( 'jatman-card', 640, 400, true );
		add_image_size( 'jatman-portrait', 480, 600, true );
	}
);

add_action(
	'wp_enqueue_scripts',
	static function (): void {
		$version = wp_get_theme()->get( 'Version' );
		wp_enqueue_style( 'jatman', get_theme_file_uri( 'assets/css/main.css' ), [], $version );
		wp_enqueue_script( 'jatman', get_theme_file_uri( 'assets/js/theme.js' ), [], $version, [ 'strategy' => 'defer', 'in_footer' => true ] );
	}
);

/** Pasang data-theme sebelum body dirender. localStorage bisa diblokir, jadi dibungkus try/catch. */
add_action(
	'wp_head',
	static function (): void {
		wp_print_inline_script_tag(
			"(function(){var s=null;try{s=localStorage.getItem('jatman-theme');}catch(e){}" .
			"var d=s==='dark'||(s!=='light'&&!!window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);" .
			"document.documentElement.setAttribute('data-theme',d?'dark':'light');})();"
		);
	},
	0
);

add_action(
	'wp_head',
	static function (): void {
		// Hanya Inter latin yang di-preload; subset lain dimuat saat dibutuhkan (unicode-range).
		foreach ( [ 'inter-latin-wght-normal.woff2' ] as $font ) {
			printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( get_theme_file_uri( 'assets/fonts/' . $font ) ) );
		}
		if ( ! has_site_icon() ) {
			printf( '<link rel="icon" href="%s" type="image/svg+xml">' . "\n", esc_url( get_theme_file_uri( 'assets/img/favicon.svg' ) ) );
		}
	},
	1
);

// Tanpa emoji CDN (s.w.org): tidak boleh ada request ke pihak ketiga.
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
remove_action( 'admin_print_styles', 'print_emoji_styles' );
add_filter(
	'wp_resource_hints',
	static function ( array $urls, string $type ): array {
		if ( 'dns-prefetch' !== $type ) {
			return $urls;
		}
		return array_values( array_filter( $urls, static fn( $u ) => ! str_contains( is_array( $u ) ? ( $u['href'] ?? '' ) : (string) $u, 's.w.org' ) ) );
	},
	10,
	2
);

add_filter(
	'body_class',
	static function ( array $classes ): array {
		if ( function_exists( 'jatman_is_teduh' ) && ( ( is_singular( 'post' ) && jatman_is_teduh( get_queried_object_id() ) ) || ( is_category() && jatman_is_teduh() ) ) ) {
			$classes[] = 'is-teduh';
		}
		return $classes;
	}
);
