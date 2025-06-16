import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A', // Main dark background (a deep teal/green)
    secondary: '#1B3B3A', // Header/darker background (slightly lighter dark teal), used for modal backgrounds, and now for password inputs on dark.
    cardBlue: '#F8DFA7', // The light, warm card background (light beige/gold) - INTENTIONALLY LIGHT

    accentOrange: '#D16930', // Vibrant orange
    accentOrangeHover: '#E17A45', // Slightly lighter orange for hover

    accentYellow: '#FFE9A0', // Light yellow for accents
    accentYellowHover: '#FDD97A', // Slightly darker yellow for hover

    textLight: '#FDF6EE', // Very light text, for use on dark backgrounds (primary, secondary, ui.background, MODALS)
    textMuted: '#B7C4C4', // Muted text for subtle elements on dark backgrounds
    textDark: '#2A2A2A', // Dark text, for use on light backgrounds (like cardBlue, INPUT FIELDS)
    textBurnt: '#3B2F1B', // Even darker, burnt-sienna like text for strong contrast on light elements - NEW PRIMARY FOR HEADINGS ON LIGHT CARDS

    paper: '#2D3748', // This color matches the 'ui.background' you previously had, providing a muted dark background

    subtleLightBg: 'rgba(0,0,0,0.05)', // A very faint black overlay for inner sections on light cards (original usage)
    // NEW: Add a clearer light inner background for light cards
    brightCardInner: '#FFFFFF', // Pure white for a crisp inner section on light cards
    // OR, if you prefer a subtle off-white that matches textLight:
    // brightCardInner: '#FDF6EE', // Matches textLight, could be used for inner background
  },
  ui: {
    background: '#1E3A39', // General UI background, similar to primary
  },
  // ... other standard colors (green, red, gray, orange, blue) - no changes here
  green: { 50: '#F0FFF4', 100: '#C6F6D5', 200: '#9AE6B4', 300: '#68D391', 400: '#48BB78', 500: '#38A169', 600: '#2F855A', 700: '#276749', 800: '#22543D', 900: '#1C4532' },
  red: { 50: '#FFF5F5', 100: '#FED7D7', 200: '#FC8181', 300: '#E53E3E', 400: '#C53030', 500: '#9B2C2C', 600: '#822727', 700: '#63171B', 800: '#441C20', 900: '#2C1717' },
  gray: { 50: '#F7FAFC', 100: '#EDF2F7', 200: '#E2E8F0', 300: '#CBD5E0', 400: '#A0AEC0', 500: '#718096', 600: '#4A5568', 700: '#2D3748', 800: '#1A202C', 900: '#171923' },
  orange: { 50: '#FFFAF0', 100: '#FEEBC8', 200: '#FBD38D', 300: '#F6AD55', 400: '#ED8936', 500: '#DD6B20', 600: '#C05621', 700: '#9C4221', 800: '#7B341E', 900: '#652B1E' },
  blue: { 50: '#EBF8FF', 100: '#BEE3F8', 200: '#90CDF4', 300: '#63B3ED', 400: '#4299E1', 500: '#3182CE', 600: '#2B6CB0', 700: '#2C5282', 800: '#2A4365', 900: '#1A365D' },
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  Card: {
    baseStyle: {
      container: {
        bg: 'brand.cardBlue', // Main card background is light
        color: 'brand.textDark', // Default text color on card is dark
        borderRadius: 'xl',
        boxShadow: 'lg',
        // The _dark pseudo-prop should ideally apply to elements within a Card
        // when the overall color mode is 'dark'. Your current global styles
        // handle this for headings/text/svgs inside Card components.
        // It's also applied through the `layerStyles.cardBlue` directly on the Box.
      }
    }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      fontWeight: 'normal',
    },
    sizes: {
      pageTitle: {
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
        color: 'brand.textLight', // This is for main page titles on the dark body background
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: fonts.body,
      lineHeight: 'tall',
      // No explicit color here, should inherit from parent or be set explicitly
      // For general text on brand.cardBlue, it will be brand.textDark from Card baseStyle
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'brand.secondary', // Modal backgrounds are dark
        color: 'brand.textLight', // Modal text is light
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight',
        'label': { // Labels inside modals are light
          color: 'brand.textLight !important',
        },
        'h1, h2, h3, h4, h5, h6': { // Headings inside modals are light
          color: 'brand.textLight !important',
        },
      },
      footer: {
        borderTopWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }
    }
  },
  Button: {
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') {
          return {
            bg: 'brand.accentOrange',
            color: 'white',
            _hover: { bg: 'brand.accentOrangeHover' }
          };
        }
        if (props.colorScheme === 'brandAccentYellow') {
          return {
            bg: 'brand.accentYellow',
            color: 'brand.textDark', // Buttons with yellow background need dark text
            _hover: { bg: 'brand.accentYellowHover' }
          };
        }
        return {};
      },
      outline: (props) => ({ // ADDED/MODIFIED: Outline variant for buttons
        borderColor: 'brand.textMuted', // Default outline for dark themes
        color: 'brand.textLight',
        _hover: {
          bg: 'whiteAlpha.200',
          color: 'brand.accentYellow',
          borderColor: 'brand.accentYellow',
        },
      }),
    },
    defaultProps: { // Set default variant if you have a common one
      variant: 'solid',
    },
  },
  Table: {
    baseStyle: {
      th: {
        color: 'brand.textDark !important', // Table headers on light backgrounds are dark
        borderColor: 'rgba(0,0,0,0.1) !important',
        textTransform: 'uppercase',
      },
      td: {
        color: 'brand.textDark !important', // Table data on light backgrounds is dark
        borderColor: 'rgba(0,0,0,0.05) !important',
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important', // Text input on light backgrounds (like cardBlue) is dark
          bg: 'whiteAlpha.900 !important', // Solid white background for editable inputs
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
      filled: { // NEW: For read-only inputs on light backgrounds
        field: {
          bg: 'rgba(0,0,0,0.08) !important', // Slightly darker, subtle fill on light cards
          color: 'brand.textDark !important', // Text color is dark
          borderColor: 'transparent',
          _hover: { bg: 'rgba(0,0,0,0.1) !important' },
          _focus: { bg: 'rgba(0,0,0,0.1) !important' },
          isReadOnly: true,
        },
      },
    },
    defaultProps: {
      variant: 'outline', // Default for inputs, for editable fields
    },
  },
  Select: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important', // Ensure text is dark on light backgrounds
          bg: 'whiteAlpha.900 !important',
          borderColor: 'brand.textMuted',
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  Textarea: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important', // Ensure text is dark on light backgrounds
          bg: 'whiteAlpha.900 !important',
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  NumberInput: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important', // Ensure text is dark on light backgrounds
          bg: 'whiteAlpha.900 !important',
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  FormLabel: {
    baseStyle: {
      mb: 2, // Added more spacing
      color: 'brand.textDark', // IMPORTANT: Labels on light backgrounds must be dark
      fontWeight: 'medium', // Make labels slightly bolder
    },
  },
  Stat: {
    baseStyle: {
      label: {
        color: 'brand.textDark', // Stats on light backgrounds are dark
      },
      number: {
        color: 'brand.textBurnt', // Stats numbers pop with burnt color
      }
    }
  },
  Accordion: {
    baseStyle: {
      container: {
        borderWidth: '0 !important',
      },
      button: {
        _hover: {
          bg: 'whiteAlpha.100',
        },
      },
      panel: {},
    },
  },
  Tag: {
    baseStyle: {
      container: {
        fontWeight: 'bold',
        borderRadius: 'full',
      },
    },
    variants: {
      subtle: (props) => ({
        container: {
          bg: `${props.colorScheme}.600`,
          color: 'white',
        }
      }),
      solid: (props) => ({
        container: {
          bg: `${props.colorScheme}.700`,
          color: 'white',
        }
      }),
      outline: (props) => ({
        container: {
          color: `${props.colorScheme}.600`,
          borderColor: `${props.colorScheme}.600`,
        }
      })
    },
    defaultProps: {
      variant: 'subtle',
    }
  },
  MenuList: {
    baseStyle: {
      bg: 'brand.cardBlue', // Menu is light
      color: 'brand.textDark', // Default text color for items (dark)
      borderColor: 'rgba(0,0,0,0.1)',
      boxShadow: 'lg',
    },
  },
  MenuItem: {
    baseStyle: {
      // This is the most targeted approach within the theme for MenuItems
      // Apply this for default (not hovered/focused) state
      _dark: { // Assuming the general site color mode is 'dark'
        color: 'var(--chakra-colors-brand-textDark) !important', // Direct color on the button
        'p, span, div, strong': { // Target specific text wrappers within the MenuItem
          color: 'var(--chakra-colors-brand-textDark) !important',
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-brand-textDark) !important', // Override Chakra's internal text var
        },
      },
      _hover: {
        bg: 'brand.secondary', // Hover state is dark
        color: 'brand.textLight', // Color for the MenuItem button itself on hover is light
        'p, span, div, strong': {
          color: 'var(--chakra-colors-brand-textLight) !important', // Color for text wrappers on hover is light
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-brand-textLight) !important',
        },
      },
      _focus: { // Focus state is similar to hover
        bg: 'brand.secondary',
        color: 'brand.textLight',
        'p, div, span, strong': {
          color: 'var(--chakra-colors-brand-textLight) !important',
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-brand-textLight) !important',
        },
      },
      // Specific styling for the Logout item (no change needed here, it correctly overrides for red)
      '&[data-chakra-menu-item="true"][color="red.600"]': {
        color: 'red.600 !important',
        'p, div, span, strong': {
          color: 'red.600 !important',
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-red-600) !important',
        },
        _hover: {
          bg: 'red.800',
          color: 'white',
          'p, div, span, strong': {
            color: 'white !important',
            '--chakra-colors-chakra-body-text': 'var(--chakra-colors-white) !important',
          },
        },
        _focus: {
          bg: 'red.800',
          color: 'white',
          'p, div, span, strong': {
            color: 'white !important',
            '--chakra-colors-chakra-body-text': 'var(--chakra-colors-white) !important',
          },
        }
      }
    },
  },
  MenuDivider: {
    baseStyle: {
      borderColor: 'rgba(0,0,0,0.1)',
    },
  },
};

const config = {
  initialColorMode: 'dark', // Keep initial color mode dark
  useSystemColorMode: false,
};

const layerStyles = {
  cardBlue: { // This defines your main light card style
    bg: 'brand.cardBlue', // Light background
    color: 'brand.textDark', // Default text color for items directly inside this layer
    borderRadius: 'xl',
    boxShadow: 'lg',
    p: 8,
    textAlign: 'center',
    borderWidth: '1px',
    borderColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.2s ease-in-out',
    _hover: {
      transform: 'translateY(-5px)',
      boxShadow: 'xl',
      borderColor: 'brand.accentYellow',
    },
    // Global overrides for headings, paragraphs, and SVGs within this card
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: 'brand.textBurnt !important', // Headings within light card are burnt
      fontFamily: `${fonts.heading} !important`,
    },
    '& p, & div:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component]), & span:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
      color: 'brand.textDark !important', // Text within light card is dark
      fontFamily: `${fonts.body} !important`,
    },
    '& svg': {
      color: 'brand.textBurnt !important', // Icons within light card are burnt
    },
  },
  // MODIFIED: This is for INNER SECTIONS on a LIGHT CARD. Make it more distinct.
  lightCardInnerSection: {
    bg: 'brand.brightCardInner', // Use the newly defined brighter white for inner sections
    color: 'brand.textDark', // Text within this section is dark
    borderRadius: 'md',
    p: 6, // Increased padding slightly for better visual breathing room
    borderWidth: '1px',
    borderColor: 'rgba(0,0,0,0.15)', // More visible border
    boxShadow: 'sm', // Add a subtle shadow for depth
  },
  // ADDED: A specific dark inner section for cases like the password form
  darkInnerSection: { // Renamed from darkModalInnerSection to avoid confusion
    bg: 'brand.secondary', // A darker background for inner sections (like the password form fields)
    color: 'brand.textLight', // Text within this section is light
    borderRadius: 'md',
    p: 6,
    borderWidth: '1px',
    borderColor: 'rgba(255,255,255,0.1)',
    boxShadow: 'sm',
    // Ensure labels and inputs within this section are styled for dark background
    '& .chakra-form__label': { // Target FormLabel specifically within this layer
      color: 'brand.textLight !important',
    },
    '& .chakra-input__field, & .chakra-textarea__field, & .chakra-select__field, & .chakra-numberinput__field': {
      // These will be styled by ThemedInput in Profile.jsx for the dark context
      // but if you were using standard inputs here, you'd need overrides.
    },
  },
  // Renamed darkModalInnerSection to darkModalOverlay to clarify its purpose (if used for modals)
  // Or remove it if darkInnerSection replaces its use completely outside of actual modals.
  // Keeping it as is for now, but consider renaming for clarity if it's not a modal overlay.
  darkModalInnerSection: { // Retained, assuming it's for modal *content* backgrounds
    bg: 'brand.primary',
    color: 'brand.textLight',
    borderRadius: 'md',
    p: 4,
    borderWidth: '1px',
    borderColor: 'rgba(255,255,255,0.1)',
  },
};

const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  layerStyles, // Ensure layerStyles is included here
  styles: {
    global: {
      body: {
        bg: 'brand.primary', // Overall site background is dark
        color: 'brand.textLight', // Default body text is light
      },
      a: {
        color: 'brand.accentYellow',
        _hover: {
          textDecoration: 'underline',
        },
      },
      // Keep direct index.css overrides for MenuItems only if absolutely necessary
      // The MenuItem theme component style should be sufficient now.
      // I've removed the global overrides here, relying on `components.MenuItem.baseStyle` now.
      // If issues persist, you might need to bring back targeted !important rules in index.css.
    },
  },
});

export default theme;
