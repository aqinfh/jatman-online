<?php
$arab = render_block( parse_blocks( '<!-- wp:paragraph {"className":"jm-arab"} --><p class="jm-arab">بسم الله الرحمن الرحيم</p><!-- /wp:paragraph -->' )[0] );
jt_assert( str_contains( $arab, 'lang="ar"' ) && str_contains( $arab, 'dir="rtl"' ), 'paragraf Arab diberi lang & dir' );
$plain = render_block( parse_blocks( '<!-- wp:paragraph --><p>Biasa</p><!-- /wp:paragraph -->' )[0] );
jt_assert( ! str_contains( $plain, 'lang=' ), 'paragraf biasa tidak diubah' );
