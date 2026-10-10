( function ( wp, names ) {
	const el = wp.element.createElement;
	const ServerSideRender = wp.serverSideRender;
	const { useBlockProps } = wp.blockEditor;
	names.forEach( ( name ) => {
		wp.blocks.registerBlockType( name, {
			edit: ( props ) => el( 'div', useBlockProps(), el( ServerSideRender, { block: name, attributes: props.attributes } ) ),
			save: () => null,
		} );
	} );
} )( window.wp, window.jatmanBlocks || [] );
