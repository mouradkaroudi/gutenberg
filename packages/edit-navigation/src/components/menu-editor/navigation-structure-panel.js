/**
 * WordPress dependencies
 */
import { __experimentalBlockNavigationTree } from '@wordpress/block-editor';
import { Card, CardHeader } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

export default function NavigationStructurePanel( { blocks } ) {
	const selectedBlockClientIds = useSelect(
		( select ) => select( 'core/block-editor' ).getSelectedBlockClientIds(),
		[]
	);
	const { selectBlock } = useDispatch( 'core/block-editor' );
	const showNavigationStructure = !! blocks.length;

	return (
		<Card className="edit-navigation-menu-editor__navigation-structure-panel">
			<CardHeader>{ __( 'Navigation' ) }</CardHeader>

			{ showNavigationStructure && (
				<__experimentalBlockNavigationTree
					blocks={ blocks }
					selectedBlockClientId={ selectedBlockClientIds[ 0 ] }
					selectBlock={ selectBlock }
					__experimentalFeatures
					showNestedBlocks
					showAppender
					showBlockMovers
				/>
			) }
		</Card>
	);
}
