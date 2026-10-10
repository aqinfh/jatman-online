<?php
/** Pita tipis di atas header: penanda penerbit resmi + tanggal Masehi. */
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'jm-topbar' ] ); ?>>
	<div class="jm-topbar__inner">
		<a class="jm-topbar__org" href="<?php echo esc_url( home_url( '/tentang/' ) ); ?>">
			<span class="jm-lambang"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/img/lambang-jatman.svg' ) ); ?>" alt="" width="22" height="22"></span>
			<span class="jm-topbar__long">Media resmi Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah</span>
			<span class="jm-topbar__short">Media resmi JATMAN</span>
		</a>
		<time class="jm-topbar__date" datetime="<?php echo esc_attr( wp_date( 'Y-m-d' ) ); ?>"><?php echo esc_html( wp_date( 'l, j F Y' ) ); ?></time>
	</div>
</div>
