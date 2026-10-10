( function ( wp ) {
	const el = wp.element.createElement;
	const { PluginDocumentSettingPanel } = wp.editor;
	const { CheckboxControl } = wp.components;
	const { useSelect, useDispatch } = wp.data;

	function PilihanPanel() {
		const checked = useSelect(
			( select ) => !! ( select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {} ).jatman_pilihan,
			[]
		);
		const { editPost } = useDispatch( 'core/editor' );
		return el(
			PluginDocumentSettingPanel,
			{ name: 'jatman-pilihan', title: 'Pilihan Redaksi' },
			el( CheckboxControl, {
				label: 'Tampilkan di Pilihan Redaksi',
				help: 'Muncul di daftar Pilihan Redaksi di beranda.',
				checked,
				onChange: ( value ) => editPost( { meta: { jatman_pilihan: value } } ),
			} )
		);
	}

	wp.plugins.registerPlugin( 'jatman-pilihan', { render: PilihanPanel } );
} )( window.wp );
