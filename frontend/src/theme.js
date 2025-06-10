// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#2D2A26',      // A rich, dark brown for the main background
    primaryLight: '#4A443E', // Lighter brown for hovers/accents
    primaryDark: '#1A1A1A',  // A deeper dark for contrast
    
    secondary: '#A1887F',    // The tan color you wanted for the header
    
    accentOrange: '#FF7043',
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFEE58',
    accentYellowHover: '#FDD835',
    
    cardBg: '#FFFFFF',       // Pure white for cards (like the login panel)
    
    textLight: '#E8E6E3',     // Off-white for text on dark backgrounds
    textDark: '#3E2723',      // Dark brown for text on light backgrounds
  },
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  // Sets default text color inside cards to be dark and readable
  Card: {
    baseStyle: {
        container: {
            bg: 'brand.cardBg',
            color: 'brand.textDark', 
            borderRadius: 'xl',
            boxShadow: 'lg',
        }
    }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      color: 'brand.textLight', // Default for headings on the main page
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
      color: 'brand.textLight', // Default for text on the main page
      lineHeight: 'tall',
    },
  },
  // Other components...
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
        bg: 'brand.primary',
        color: 'brand.textLight',
      },
    },
  },
});

export default theme;
