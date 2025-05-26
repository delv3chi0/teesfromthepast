// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    // Primary: Dark Brown
    primary: '#5D4037',        // Main dark brown
    primaryLight: '#795548',   // A bit lighter for hovers/accents
    primaryDark: '#4E342E',    // A bit darker for active states

    // Secondary: Light Brown / Warm Off-white
    secondary: '#A1887F',      // Muted light brown
    bgLight: '#F5F5F5',        // Very light warm gray/off-white for page backgrounds
    paper: '#FFFFFF',          // For cards or distinct sections

    // Accents
    accentOrange: '#FF7043',   // Vibrant retro orange
    accentOrangeHover: '#F4511E', // Darker orange for hover

    accentYellow: '#FFEE58',   // Warm retro yellow
    accentYellowHover: '#FDD835', // Darker yellow for hover

    // Text
    textDark: '#3E2723',       // Very dark brown for text on light backgrounds
    textLight: '#EDE7F6',      // Light, slightly warm off-white for text on dark backgrounds
    textMuted: '#757575',      // Muted gray for less important text
  },
};

const fonts = {
  heading: `'Righteous', cursive`, // Specify 'cursive' or 'sans-serif' as fallback
  body: `'Montserrat', sans-serif`,
};

const components = {
  Button: {
    // Example: Make default solid buttons use your accent orange
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccent') { // Define a custom colorScheme name
          return {
            bg: 'brand.accentOrange',
            color: 'white',
            _hover: {
              bg: 'brand.accentOrangeHover',
            },
            _active: {
              bg: 'brand.accentOrangeHover',
            }
          };
        }
        // Let other colorSchemes (blue, green, etc.) use their defaults
        return {}; 
      },
    },
  },
  Heading: {
    baseStyle: {
      fontFamily: 'heading',
      color: 'brand.textDark', // Default heading color
    },
  },
  Text: {
    baseStyle: {
      fontFamily: 'body',
      color: 'brand.textDark', // Default body text color
    },
  },
  Link: { // Styling for Chakra's Link component
    baseStyle: {
      color: 'brand.accentOrange',
      _hover: {
        textDecoration: 'underline',
        color: 'brand.accentOrangeHover',
      },
    },
  },
};

// Theme configuration
const config = {
  initialColorMode: 'light', // You can set this to 'dark' or 'system'
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  styles: { // Global styles
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'brand.backgroundDark' : 'brand.bgLight', // Use a light warm gray for body bg
        color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.textDark',
      },
    }),
  },
});

export default theme;
