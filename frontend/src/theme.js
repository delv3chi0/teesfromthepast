// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

// === NEW: Warmer, more accurate retro color palette ===
const colors = {
  brand: {
    // Main dark brown background
    primary: '#3D352E',
    
    // A warmer, richer tan for the header and other elements
    secondary: '#D2B48C', // Tan
    
    // Vibrant accents that work with the new theme
    accentOrange: '#FF7043',
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFC107',
    accentYellowHover: '#FFA000',
    
    // Card and Paper backgrounds
    cardBg: '#FFFFFF',       // Pure white for cards to pop
    paper: '#F5F5F0',        // A subtle off-white for main content areas
    
    // Text colors for high contrast
    textLight: '#F5F5F0',     // Off-white for text on dark backgrounds
    textDark: '#3D352E',      // Dark brown for text on light backgrounds
    textMuted: '#A1887F',    // Muted tan for less important text on dark backgrounds
  },
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  // === UPDATED: Default styles for cards and modals ===
  Card: {
    baseStyle: {
        container: {
            bg: 'brand.cardBg',
            color: 'brand.textDark', // Text inside cards is now dark for readability
            borderRadius: 'xl',
            boxShadow: 'lg',
        }
    }
  },
  Modal: {
      baseStyle: {
          dialog: {
              bg: 'brand.cardBg', // Modals will also have the white card background
              color: 'brand.textDark'
          }
      }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      color: 'brand.textDark', // Default heading color is now dark
      fontWeight: 'normal',
    },
    sizes: {
      'pageTitle': {
        fontFamily: fonts.heading,
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: 'body',
      color: 'brand.textDark', // Default text color is dark
      lineHeight: 'tall',
    },
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
        }
    }
  },
};

const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  styles: {
    global: {
      body: {
        bg: 'brand.primary', // Use the new rich brown as the global background
        color: 'brand.textLight', // Default text on the body is light
      },
    },
  },
});

export default theme;
