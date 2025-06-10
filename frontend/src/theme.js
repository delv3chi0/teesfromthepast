// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

// === NEW: Dark Theme Color Palette ===
const colors = {
  brand: {
    // Primary colors are now your dark theme colors
    primary: '#262626',      // The main dark background from your screenshot
    primaryLight: '#383838', // A slightly lighter dark for hover states
    primaryDark: '#1A1A1A',  // A deeper dark for contrast
    
    // Secondary colors for cards and panels
    secondary: '#3C3C3C',    // The color of the card backgrounds
    secondaryLight: '#4F4F4F',
    
    // Accent colors remain the same for buttons and highlights
    accentOrange: '#FF7043',
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFEE58',
    accentYellowHover: '#FDD835',
    
    // Text colors are now light by default
    textDark: '#2D2D2D',      // Kept for use on light backgrounds if needed
    textLight: '#E0E0E0',      // The main off-white text color
    textMuted: '#A0A0A0',      // Muted gray for less important text
  },
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      color: 'brand.textLight', // Headings are light by default
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
      color: 'brand.textLight', // Body text is light by default
      lineHeight: 'tall',
    },
  },
  Button: {
    variants: {
        // Ensure your orange button style is preserved
        solid: (props) => {
            if (props.colorScheme === 'brandAccentOrange') {
                return {
                    bg: 'brand.accentOrange',
                    color: 'white',
                    _hover: { bg: 'brand.accentOrangeHover' }
                };
            }
            // Add other button variants if needed
        }
    }
  },
  Card: { // A new global style for any "card" elements
    baseStyle: {
        container: {
            bg: 'brand.secondary',
            borderRadius: 'xl',
            boxShadow: 'lg',
        }
    }
  }
};

const config = {
  initialColorMode: 'dark', // Set the initial mode to dark
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
        bg: 'brand.primary', // Use the new dark color as the global background
        color: 'brand.textLight',
      },
    },
  },
});

export default theme;
