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
    textDark: '#2A2A2A', // Dark text, for use on light backgrounds (like cardBlue, modals)
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
        bg: 'brand.cardBlue', // Use the light card background
        color: 'brand.textDark', // <--- IMPORTANT: This sets the default text color for ALL children of a Chakra <Card> to dark.
        borderRadius: 'xl',
        boxShadow: 'lg',
      }
    }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      fontWeight: 'normal',
      // We are *not* setting a default color here. Chakra's cascade will use the color from the parent (e.g., Card)
      // or the global body color if no parent explicitly sets it.
    },
    sizes: {
      pageTitle: {
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
        color: 'brand.textLight', // Explicitly set pageTitle to light, as it's on a dark background.
      },
      // You can define other heading sizes/styles here if needed,
      // and explicitly set their colors based on their expected background.
    },
  },
  Text: {
    baseStyle: {
      fontFamily: fonts.body,
      lineHeight: 'tall',
      // We are *not* setting a default color here. Chakra's cascade will use the color from the parent (e.g., Card)
      // or the global body color if no parent explicitly sets it.
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
        return {}; // Return empty object for other colorSchemes or fallback
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
  cardBlue: {
    bg: 'brand.cardBlue',
    color: 'brand.textDark', // Main text color for elements using this layer style
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
    '& svg': {
      color: 'brand.textBurnt', // SVG color on this light card
      width: '3rem',
      height: '3rem',
      mb: 5,
    },
    // Ensure headings within this layer style are also dark
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: 'brand.textBurnt', // Use textBurnt for headings on the light card background
      fontFamily: 'heading',
    },
    // Ensure paragraphs within this layer style are also dark
    '& p': {
      color: 'brand.textDark',
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
      // You might also want to ensure links are visible
      a: {
        color: 'brand.accentYellow', // Example: make links stand out
        _hover: {
          textDecoration: 'underline',
        },
      },
    },
  },
});

export default theme;
