<?php
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/user.php';

$user_id = wp_insert_user( [
	'user_login'   => 'jt-penulis',
	'user_pass'    => wp_generate_password(),
	'user_email'   => 'jt-penulis@jatman.invalid',
	'display_name' => 'Penulis Uji',
	'role'         => 'author',
] );
$tmp = wp_tempnam( 'sample.jpg' );
copy( ABSPATH . 'tests/fixtures/import/media/sample.jpg', $tmp );
$att = media_handle_sideload( [ 'name' => 'jt-avatar.jpg', 'tmp_name' => $tmp ], 0 );
try {
	jt_assert( str_ends_with( get_avatar_url( $user_id ), '/avatar-default.svg' ), 'tanpa foto → avatar bawaan lokal' );
	update_user_meta( $user_id, 'jatman_avatar_id', $att );
	$expected = wp_get_attachment_image_url( $att, 'thumbnail' );
	jt_same( $expected, get_avatar_url( $user_id ), 'foto penulis dari media lokal (ID)' );
	jt_same( $expected, get_avatar_url( get_userdata( $user_id ) ), 'foto penulis dari media lokal (WP_User)' );
	jt_assert( ! str_contains( get_avatar( $user_id ), 'gravatar.com' ), 'tidak ada request ke Gravatar' );
	jt_assert( str_contains( get_author_posts_url( $user_id ), '/profile/jt-penulis/' ), 'URL penulis /profile/<slug>/' );
} finally {
	wp_delete_user( $user_id );
	wp_delete_attachment( $att, true );
}
