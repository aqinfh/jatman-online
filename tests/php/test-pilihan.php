<?php
$meta = get_registered_meta_keys( 'post', 'post' );
jt_assert( isset( $meta['jatman_pilihan'] ), 'meta jatman_pilihan terdaftar' );
jt_same( 'boolean', $meta['jatman_pilihan']['type'] ?? null, 'meta jatman_pilihan bertipe boolean' );
jt_assert( ! empty( $meta['jatman_pilihan']['show_in_rest'] ), 'meta jatman_pilihan tersedia di REST (editor)' );
