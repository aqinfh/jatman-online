<?php
/**
 * Title: Footer JATMAN Online
 * Slug: jatman/footer
 * Categories: footer
 * Inserter: no
 */

$jatman_img = static fn( string $file ): string => esc_url( get_theme_file_uri( 'assets/img/' . $file ) );
?>
<!-- wp:group {"className":"jm-footer","layout":{"type":"default"}} -->
<div class="wp-block-group jm-footer"><!-- wp:html -->
<div class="jm-footer__ids">
	<section class="jm-footer__id" aria-labelledby="jm-footer-org">
		<span class="jm-lambang jm-lambang--lg"><img src="<?php echo $jatman_img( 'lambang-jatman-144.png' ); ?>" alt="Lambang JATMAN" width="72" height="72" loading="lazy"></span>
		<div>
			<h2 id="jm-footer-org" class="jm-footer__name">Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah</h2>
			<p>Badan otonom Nahdlatul Ulama, wadah para pengamal ajaran at-thariqah al-mu’tabarah.</p>
		</div>
	</section>
	<section class="jm-footer__id" aria-labelledby="jm-footer-media">
		<?php echo jatman_inline_svg( 'knot.svg', 'jm-footer__knot' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		<div>
			<h2 id="jm-footer-media" class="jm-footer__name">JATMAN Online</h2>
			<p>Media informasi resmi JATMAN, dikelola tim LTN JATMAN.</p>
		</div>
	</section>
</div>
<!-- /wp:html -->

<!-- wp:group {"className":"jm-footer__row","layout":{"type":"default"}} -->
<div class="wp-block-group jm-footer__row"><!-- wp:html -->
<nav aria-label="Tautan footer"><ul class="jm-footer__links">
	<li><a href="<?php echo esc_url( home_url( '/tentang/' ) ); ?>">Tentang</a></li>
	<li><a href="<?php echo esc_url( home_url( '/redaksi/' ) ); ?>">Redaksi</a></li>
	<li><a href="<?php echo esc_url( home_url( '/kontak/' ) ); ?>">Kontak</a></li>
	<li><a href="<?php echo esc_url( home_url( '/kirim-tulisan/' ) ); ?>">Kirim Tulisan</a></li>
</ul></nav>
<!-- /wp:html -->

<!-- wp:social-links {"className":"jm-social is-style-logos-only"} -->
<ul class="wp-block-social-links jm-social is-style-logos-only"><!-- wp:social-link {"url":"https://facebook.com/JATMAN.Online","service":"facebook","label":"Facebook JATMAN Online"} /-->

<!-- wp:social-link {"url":"https://instagram.com/jatman.online","service":"instagram","label":"Instagram JATMAN Online"} /-->

<!-- wp:social-link {"url":"https://www.tiktok.com/@jatman.online","service":"tiktok","label":"TikTok JATMAN Online"} /-->

<!-- wp:social-link {"url":"https://www.youtube.com/@jatmanonline","service":"youtube","label":"YouTube JATMAN Online"} /--></ul>
<!-- /wp:social-links --></div>
<!-- /wp:group -->

<!-- wp:paragraph {"className":"jm-footer__copy"} -->
<p class="jm-footer__copy">© <?php echo esc_html( wp_date( 'Y' ) ); ?> JATMAN Online. Seluruh hak dilindungi.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
