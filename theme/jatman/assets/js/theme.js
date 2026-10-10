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

	// Tab wilayah Berita di HP (<900px). Di layar lebar semua kolom tampil dan peran ARIA tab dilepas.
	document.querySelectorAll( '[data-jm-tabs]' ).forEach( ( box ) => {
		const tablist = box.querySelector( '.jm-regions__tabs' );
		const tabs = [ ...tablist.querySelectorAll( 'button' ) ];
		const panels = tabs.map( ( t ) => box.querySelector( '#' + t.getAttribute( 'aria-controls' ) ) );
		const mq = window.matchMedia( '(max-width: 899px)' );
		const select = ( index, focus ) => {
			tabs.forEach( ( tab, j ) => {
				const on = j === index;
				tab.setAttribute( 'aria-selected', String( on ) );
				tab.tabIndex = on ? 0 : -1;
				panels[ j ].hidden = ! on;
			} );
			if ( focus ) tabs[ index ].focus();
		};
		const apply = () => {
			box.classList.toggle( 'is-tabbed', mq.matches );
			tablist.hidden = ! mq.matches;
			if ( mq.matches ) {
				tablist.setAttribute( 'role', 'tablist' );
				tabs.forEach( ( tab, j ) => {
					tab.setAttribute( 'role', 'tab' );
					panels[ j ].setAttribute( 'role', 'tabpanel' );
					panels[ j ].setAttribute( 'aria-labelledby', tab.id );
				} );
				select( Math.max( 0, tabs.findIndex( ( t ) => t.getAttribute( 'aria-selected' ) === 'true' ) ), false );
			} else {
				tablist.removeAttribute( 'role' );
				tabs.forEach( ( tab, j ) => {
					tab.removeAttribute( 'role' );
					panels[ j ].removeAttribute( 'role' );
					panels[ j ].removeAttribute( 'aria-labelledby' );
					panels[ j ].hidden = false;
				} );
			}
		};
		tabs.forEach( ( tab, i ) => {
			tab.addEventListener( 'click', () => select( i, false ) );
			tab.addEventListener( 'keydown', ( e ) => {
				const step = { ArrowRight: 1, ArrowLeft: -1 }[ e.key ];
				if ( step ) {
					e.preventDefault();
					select( ( i + step + tabs.length ) % tabs.length, true );
				}
			} );
		} );
		mq.addEventListener( 'change', apply );
		apply();
	} );

	// Header mengecil setelah halaman di-scroll.
	const header = document.querySelector( '.jm-header' );
	if ( header ) {
		const onScroll = () => header.classList.toggle( 'is-condensed', window.scrollY > 80 );
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		onScroll();
	}
} )();
