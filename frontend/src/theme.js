// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#1A1D22',      // The main dark background
    secondary: '#212428',    // Header background
    
    // === NEW: Navy blue for cards ===
    cardBlue: '#2c3e50',
    
    accentOrange: '#D95A2B',
    accentOrangeHover: '#E86A3C',
    accentYellow: '#FFEE58',
    
    textLight: '#EAEAEA',
    textMuted: '#A0A0A0',
    textDark: '#1A1D22',
  },
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  Button: {
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') {
          return { bg: 'brand.accentOrange', color: 'white', _hover: { bg: 'brand.accentOrangeHover' } };
        }
      },
    },
  },
  // === UPDATED: Global styles for Cards and Modals ===
  Card: {
    baseStyle: {
        container: {
            bg: 'brand.cardBlue',
            color: 'brand.textLight', 
            borderRadius: 'xl',
        }
    }
  },
  Modal: {
      baseStyle: {
          dialog: {
              bg: 'brand.cardBlue',
              color: 'brand.textLight'
          }
      }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      color: 'brand.textLight',
      fontWeight: 'normal',
    },
    sizes: {
      'pageTitle': {
        fontSize: { base: '3xl', md: '4xl' },
        mb: 8,
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: 'body',
      color: 'brand.textLight',
      lineHeight: 'tall',
    },
  },
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
