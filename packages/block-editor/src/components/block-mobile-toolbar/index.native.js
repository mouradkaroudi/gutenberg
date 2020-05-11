/**
 * External dependencies
 */
import { Keyboard, View } from 'react-native';

/**
 * WordPress dependencies
 */
import { withDispatch, withSelect } from '@wordpress/data';
import { compose } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import styles from './style.scss';
import BlockMover from '../block-mover';
import BlockActionsMenu from './block-actions-menu';
import { BlockSettingsButton } from '../block-settings';

const BREAKPOINTS = {
	wrapSettings: 65,
	wrapMover: 150,
};
const BlockMobileToolbar = ( {
	clientId,
	onDelete,
	isStackedHorizontally,
	blockWidth,
} ) => {
	const wrapBlockSettings = blockWidth < BREAKPOINTS.wrapSettings;
	const wrapBlockMover = blockWidth <= BREAKPOINTS.wrapMover;

	return (
		<View style={ styles.toolbar }>
			{ ! wrapBlockMover && (
				<BlockMover
					clientIds={ [ clientId ] }
					isStackedHorizontally={ isStackedHorizontally }
				/>
			) }

			<View style={ styles.spacer } />

			<BlockSettingsButton.Slot>
				{ /* Render only one settings icon even if we have more than one fill - need for hooks with controls */ }
				{ ( fills = [ null ] ) => fills[ 0 ] }
			</BlockSettingsButton.Slot>

			<BlockActionsMenu
				clientIds={ [ clientId ] }
				wrapBlockMover={ wrapBlockMover }
				wrapBlockSettings={ wrapBlockSettings }
				isStackedHorizontally={ isStackedHorizontally }
				onDelete={ onDelete }
			/>
		</View>
	);
};

export default compose(
	withSelect( ( select, { clientId } ) => {
		const { getBlockIndex } = select( 'core/block-editor' );

		return {
			order: getBlockIndex( clientId ),
		};
	} ),
	withDispatch( ( dispatch, { clientId, rootClientId, onDelete } ) => {
		const { removeBlock } = dispatch( 'core/block-editor' );
		return {
			onDelete:
				onDelete ||
				( () => {
					Keyboard.dismiss();
					removeBlock( clientId, rootClientId );
				} ),
		};
	} )
)( BlockMobileToolbar );
