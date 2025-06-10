// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

// === NEW: Color palette sampled directly from your screenshot ===
const colors = {
  brand: {
    // Dark theme colors based on the "Dark Reader" look
    primary: '#302B27',      // The main dark, soft brown background
    secondary: '#4A443E',    // The slightly lighter color for cards/panels
    
    // Sidebar color
    sidebar: '#2B211C',

    // Text colors for the dark theme
    textLight: '#E8E6E3',     // The main off-white text color
    textMuted: '#A9A199',     // Muted text for less important info

    // Accent colors remain vibrant as requested
    accentOrange: '#FF7043',
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFEE58',
    accentYellowHover: '#FDD835',

    // Kept for specific use cases (like white text on orange buttons)
    textOnAccent: '#FFFFFF',
    textOnDark: '#3E2723',
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
        // This ensures your orange button style is preserved
        solid: (props) => {
            if (props.colorScheme === 'brandAccentOrange') {
                return {
                    bg: 'brand.accentOrange',
                    color: 'brand.textOnAccent', // Use pure white for buttons
                    _hover: { bg: 'brand.accentOrangeHover' }
                };
            }
        }
    }
  },
  // A new global style for any "card" elements
  Card: { 
    baseStyle: {
        container: {
            bg: 'brand.secondary',
            borderRadius: 'xl',
        }
    }
  }
};

const config = {
  initialColorMode: 'dark',
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
