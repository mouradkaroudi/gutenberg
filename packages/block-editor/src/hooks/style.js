/**
 * External dependencies
 */
import { has, get, startsWith, reduce, merge } from 'lodash';

/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { hasBlockSupport } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	Platform,
	createContext,
	useContext,
	useMemo,
} from '@wordpress/element';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import InspectorControls from '../components/inspector-controls';
import { COLOR_SUPPORT_KEY, ColorEdit } from './color';
import { LINE_HEIGHT_SUPPORT_KEY, LineHeightEdit } from './line-height';
import { FONT_SIZE_SUPPORT_KEY, FontSizeEdit } from './font-size';

const styleSupportKeys = [
	COLOR_SUPPORT_KEY,
	LINE_HEIGHT_SUPPORT_KEY,
	FONT_SIZE_SUPPORT_KEY,
];

const typographySupportKeys = [
	LINE_HEIGHT_SUPPORT_KEY,
	FONT_SIZE_SUPPORT_KEY,
];

const hasStyleSupport = ( blockType ) =>
	styleSupportKeys.some( ( key ) => hasBlockSupport( blockType, key ) );

const VARIABLE_REFERENCE_PREFIX = 'var:';
const VARIABLE_PATH_SEPARATOR_TOKEN_ATTRIBUTE = '|';
const VARIABLE_PATH_SEPARATOR_TOKEN_STYLE = '--';
function compileStyleValue( uncompiledValue ) {
	if ( startsWith( uncompiledValue, VARIABLE_REFERENCE_PREFIX ) ) {
		const variable = uncompiledValue
			.slice( VARIABLE_REFERENCE_PREFIX.length )
			.split( VARIABLE_PATH_SEPARATOR_TOKEN_ATTRIBUTE )
			.join( VARIABLE_PATH_SEPARATOR_TOKEN_STYLE );
		return `var(--wp--${ variable })`;
	}
	return uncompiledValue;
}

/**
 * Returns the inline styles to add depending on the style object
 *
 * @param  {Object} styles Styles configuration
 * @return {Object}        Flattened CSS variables declaration
 */
export function getInlineStyles( styles = {} ) {
	const mappings = {
		lineHeight: [ 'typography', 'lineHeight' ],
		fontSize: [ 'typography', 'fontSize' ],
		background: [ 'color', 'gradient' ],
		backgroundColor: [ 'color', 'background' ],
		color: [ 'color', 'text' ],
		'--wp--color--link': [ 'color', 'link' ],
	};

	const output = {};
	Object.entries( mappings ).forEach( ( [ styleKey, objectKey ] ) => {
		if ( has( styles, objectKey ) ) {
			output[ styleKey ] = compileStyleValue( get( styles, objectKey ) );
		}
	} );

	return output;
}

/**
 * Filters registered block settings, extending attributes to include `style` attribute.
 *
 * @param  {Object} settings Original block settings
 * @return {Object}          Filtered block settings
 */
function addAttribute( settings ) {
	if ( ! hasStyleSupport( settings ) ) {
		return settings;
	}

	// allow blocks to specify their own attribute definition with default values if needed.
	if ( ! settings.attributes.style ) {
		Object.assign( settings.attributes, {
			style: {
				type: 'object',
			},
		} );
	}

	return settings;
}

/**
 * Override props assigned to save component to inject the CSS variables definition.
 *
 * @param  {Object} props      Additional props applied to save element
 * @param  {Object} blockType  Block type
 * @param  {Object} attributes Block attributes
 * @return {Object}            Filtered props applied to save element
 */
export function addSaveProps( props, blockType, attributes ) {
	if ( ! hasStyleSupport( blockType ) ) {
		return props;
	}

	const { style } = attributes;
	props.style = {
		...getInlineStyles( style ),
		...props.style,
	};

	return props;
}

/**
 * Filters registered block settings to extand the block edit wrapper
 * to apply the desired styles and classnames properly.
 *
 * @param  {Object} settings Original block settings
 * @return {Object}          Filtered block settings
 */
export function addEditProps( settings ) {
	if ( ! hasStyleSupport( settings ) ) {
		return settings;
	}

	const existingGetEditWrapperProps = settings.getEditWrapperProps;
	settings.getEditWrapperProps = ( attributes ) => {
		let props = {};
		if ( existingGetEditWrapperProps ) {
			props = existingGetEditWrapperProps( attributes );
		}

		return addSaveProps( props, settings, attributes );
	};

	return settings;
}

const GlobalStylesContext = createContext( {} );

// Todo: Move this specification to the block.json
const selectorMapping = {
	'core/heading/h1': ( { level } ) => level === 1,
	'core/heading/h2': ( { level } ) => level === 2,
	'core/heading/h3': ( { level } ) => level === 3,
	'core/heading/h4': ( { level } ) => level === 4,
	'core/heading/h5': ( { level } ) => level === 5,
	'core/heading/h6': ( { level } ) => level === 6,
};

/**
 * Override the default edit UI to include new inspector controls for
 * all the custom styles configs.
 *
 * @param  {Function} BlockEdit Original component
 * @return {Function}           Wrapped component
 */
export const withBlockControls = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		const { name: blockName } = props;
		const hasTypographySupport = typographySupportKeys.some( ( key ) =>
			hasBlockSupport( blockName, key )
		);

		const { __experimentalGlobalStyles } = useSelect( ( select ) => {
			return select( 'core/block-editor' ).getSettings();
		}, [] );
		const globalStylesContext = useContext( GlobalStylesContext );

		const globalStylesBlock = useMemo( () => {
			const globalBlockSpecificStyles = reduce(
				__experimentalGlobalStyles,
				( accumulator, value, selector ) => {
					if (
						selector === blockName ||
						( selector.startsWith( blockName ) &&
							selectorMapping[ selector ]( props.attributes ) )
					) {
						return merge( accumulator, value.styles );
					}
					return accumulator;
				},
				{}
			);

			// The styles are merged according the following priority:
			// First: Local block styles.
			// Second: Styles targeting the block specifically.
			// Third: Styles inherited from the parent blocks.
			// Forth: The global styles applied to the root.
			return merge(
				{},
				__experimentalGlobalStyles?.global?.styles || {},
				globalStylesContext || {},
				globalBlockSpecificStyles,
				props.attributes.style || {}
			);
		} );

		return (
			<GlobalStylesContext.Provider value={ globalStylesBlock }>
				{ Platform.OS === 'web' && hasTypographySupport && (
					<InspectorControls key="typography">
						<PanelBody title={ __( 'Typography' ) }>
							<FontSizeEdit { ...props } />
							<LineHeightEdit { ...props } />
						</PanelBody>
					</InspectorControls>
				) }
				<ColorEdit
					key="colors"
					globalStyles={ globalStylesBlock }
					{ ...props }
				/>
				<BlockEdit key="edit" { ...props } />
			</GlobalStylesContext.Provider>
		);
	},
	'withToolbarControls'
);

addFilter(
	'blocks.registerBlockType',
	'core/style/addAttribute',
	addAttribute
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'core/style/addSaveProps',
	addSaveProps
);

addFilter(
	'blocks.registerBlockType',
	'core/style/addEditProps',
	addEditProps
);

addFilter(
	'editor.BlockEdit',
	'core/style/with-block-controls',
	withBlockControls
);
