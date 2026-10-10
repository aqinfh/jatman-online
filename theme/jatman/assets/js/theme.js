( () => {
	const root = document.documentElement;
	const KEY = 'jatman-theme';

	const syncToggles = () => {
		document.querySelectorAll( '[data-jm-theme-toggle]' ).forEach( ( btn ) => {
			btn.setAttribute( 'aria-pressed', String( root.dataset.theme === 'dark' ) );
		} );
	};

	document.addEventListener( 'click', ( event ) => {
		const toggle = event.target.closest( '[data-jm-theme-toggle]' );
		if ( toggle ) {
			const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
			root.dataset.theme = next;
			try {
				localStorage.setItem( KEY, next );
			} catch ( e ) {
				// Penyimpanan diblokir: pilihan hanya berlaku di halaman ini.
			}
			syncToggles();
		}

		const copy = event.target.closest( '[data-jm-copy]' );
		if ( copy && navigator.clipboard ) {
			navigator.clipboard.writeText( copy.dataset.jmCopy ).then( () => {
				const status = copy.closest( '.jm-share' )?.querySelector( '.jm-share__status' );
				if ( status ) status.textContent = 'Tautan disalin';
			}, () => {} );
		}
	} );

	syncToggles();

	// Hitungan pembaca artikel (lihat mu-plugin views.php).
	// Satu beacon per artikel per sesi browser (dedupe utama tetap di server per IP).
	const viewed = document.querySelector( '[data-jm-view]' );
	if ( viewed && navigator.sendBeacon ) {
		const seenKey = `jatman-viewed:${ viewed.dataset.jmView }`;
		let seen = false;
		try {
			seen = sessionStorage.getItem( seenKey ) === '1';
			sessionStorage.setItem( seenKey, '1' );
		} catch ( e ) {
			// sessionStorage diblokir: biarkan server yang mendedupe.
		}
		if ( ! seen ) navigator.sendBeacon( viewed.dataset.jmView );
	}

	// "Muat lebih banyak": peningkatan progresif di atas pagination biasa (tanpa JS tetap bisa ke halaman 2, 3, …).
	document.querySelectorAll( '.jm-archive__body .wp-block-query' ).forEach( ( query ) => {
		const grid = query.querySelector( '.jm-grid, .jm-feed' );
		const pagination = query.querySelector( '.jm-pagination' );
		let next = pagination?.querySelector( '.wp-block-query-pagination-next' )?.href;
		if ( ! grid || ! next ) return;

		const wrap = document.createElement( 'div' );
		wrap.className = 'jm-loadmore';
		wrap.innerHTML = '<button type="button" class="jm-loadmore__button">Muat lebih banyak</button><p class="jm-loadmore__status" role="status" aria-live="polite"></p>';
		pagination.hidden = true;
		pagination.after( wrap );
		const button = wrap.querySelector( 'button' );
		const status = wrap.querySelector( '.jm-loadmore__status' );
		let loaded = 0;

		button.addEventListener( 'click', async () => {
			button.disabled = true;
			button.textContent = 'Memuat…';
			try {
				const html = await ( await fetch( next, { credentials: 'same-origin' } ) ).text();
				const doc = new DOMParser().parseFromString( html, 'text/html' );
				const items = [ ...doc.querySelectorAll( '.jm-archive__body .jm-grid > li, .jm-archive__body .jm-feed > li' ) ];
				items.forEach( ( li ) => grid.append( document.importNode( li, true ) ) );
				loaded += items.length;
				status.textContent = `${ loaded } tulisan lagi dimuat`;
				next = doc.querySelector( '.jm-archive__body .wp-block-query-pagination-next' )?.href;
				if ( next ) {
					button.disabled = false;
					button.textContent = 'Muat lebih banyak';
				} else {
					button.remove();
				}
			} catch ( e ) {
				// Gagal memuat: kembalikan pagination biasa supaya pembaca tetap bisa lanjut.
				pagination.hidden = false;
				wrap.remove();
			}
		} );
	} );

	// Header mengecil setelah halaman di-scroll.
	const header = document.querySelector( '.jm-header' );
	if ( header ) {
		const onScroll = () => header.classList.toggle( 'is-condensed', window.scrollY > 80 );
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		onScroll();
	}
} )();
