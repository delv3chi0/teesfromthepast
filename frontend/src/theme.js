import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A', // Main dark background (a deep teal/green)
    secondary: '#1B3B3A', // Header/darker background (slightly darker teal/green)

    cardBlue: '#F8DFA7', // The new light, warm card background (light beige/gold)

    accentOrange: '#D16930', // Vibrant orange
    accentOrangeHover: '#E17A45', // Slightly lighter orange for hover

    accentYellow: '#FFE9A0', // Light yellow for accents
    accentYellowHover: '#FDD97A', // Slightly darker yellow for hover

    textLight: '#FDF6EE', // Very light text, for use on dark backgrounds (primary, secondary, ui.background)
    textMuted: '#B7C4C4', // Muted text for subtle elements on dark backgrounds
    textDark: '#2A2A2A', // Dark text, for use on light backgrounds (like cardBlue)
    textBurnt: '#3B2F1B', // Even darker, burnt-sienna like text for strong contrast on light elements
  },
  ui: {
    background: '#1E3A39', // A solid dark background for general UI elements (similar to primary/secondary)
  }
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  Card: {
    baseStyle: {
        container: {
            bg: 'brand.cardBlue',
            color: 'brand.textDark', // Default color for text directly inside Card (e.g., a simple div)
            borderRadius: 'xl',
            boxShadow: 'lg',
            // --- Crucial addition for forcing child colors ---
            _dark: { // Apply these styles in dark mode (which is your initialColorMode)
                'h1, h2, h3, h4, h5, h6': { // Target all heading tags directly
                    color: 'brand.textBurnt', // Use a very dark color for headings on light card
                    fontFamily: fonts.heading, // Ensure Bungee for native headings
                },
                'p': { // Target paragraph tags directly
                    color: 'brand.textDark', // Use dark color for paragraphs on light card
                    fontFamily: fonts.body, // Ensure Montserrat for native paragraphs
                },
                'svg': {
                    color: 'brand.textBurnt', // Ensure SVGs within card are dark
                },
            }
            // --- End crucial addition ---
        }
    }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      fontWeight: 'normal',
      // DO NOT set color here globally unless absolutely necessary, let it inherit or be set by parents/variants
    },
    sizes: {
      pageTitle: {
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
        color: 'brand.textLight', // Explicitly light for page title on dark background
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: fonts.body,
      lineHeight: 'tall',
      // DO NOT set color here globally unless absolutely necessary
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'brand.secondary', // Use a dark background for modals
        color: 'brand.textLight', // Light text for dark modal background
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight',
      },
      footer: {
        borderTopWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  Button: {
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') {
          return {
            bg: 'brand.accentOrange',
            color: 'white',
            _hover: { bg: 'brand.accentOrangeHover' },
          };
        }
        if (props.colorScheme === 'brandAccentYellow') {
          return {
            bg: 'brand.accentYellow',
            color: 'brand.textDark', // Dark text on yellow button for contrast
            _hover: { bg: 'brand.accentYellowHover' },
          };
        }
        return {};
      },
    },
  },
};

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const layerStyles = {
  // This is for custom components or divs where you apply the layerStyle prop
  // It provides an alternative if you're not using Chakra's <Card> directly for these sections,
  // but applying a Box with layerStyle="cardBlue". Keep this for robustness.
  cardBlue: {
    bg: 'brand.cardBlue',
    color: 'brand.textDark', // Default text color for elements using this layer style
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
    // Ensure headings and paragraphs within this layer style are also dark
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: 'brand.textBurnt', // Use textBurnt for headings on the light card background
      fontFamily: fonts.heading, // Make sure native headings use Bungee
    },
    '& p': {
      color: 'brand.textDark', // Use textDark for paragraphs on the light card background
      fontFamily: fonts.body, // Make sure native paragraphs use Montserrat
    },
    '& svg': {
      color: 'brand.textBurnt', // Ensure SVGs within this layer are dark
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  layerStyles,
  styles: {
    global: {
      body: {
        bg: 'brand.primary', // Global body background remains dark
        color: 'brand.textLight', // Global text color remains light (for elements on the dark body background)
      },
      a: {
        color: 'brand.accentYellow',
        _hover: {
          textDecoration: 'underline',
        },
      },
    },
  },
});

export default theme;
