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

	// Header mengecil setelah halaman di-scroll.
	const header = document.querySelector( '.jm-header' );
	if ( header ) {
		const onScroll = () => header.classList.toggle( 'is-condensed', window.scrollY > 80 );
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		onScroll();
	}
} )();
