// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

// A new, refined color palette based on your screenshot
const colors = {
  brand: {
    primary: '#1A1D22',      // The main dark background
    secondary: '#2C3539',    // A slightly lighter dark for cards and panels
    headerBg: '#212428',     // A specific dark color for the top header
    sidebar: '#1A1D22',      // Sidebar background
    
    accentOrange: '#D95A2B', // The vibrant orange from your buttons
    accentOrangeHover: '#E86A3C',
    
    textLight: '#EAEAEA',     // The main off-white text color
    textMuted: '#949494',      // Muted gray for less important text
    textDark: '#1A1D22',      // Dark text for use on light backgrounds (like buttons)
  },
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  Button: {
    baseStyle: {
      borderRadius: "full",
      fontWeight: "bold",
      transition: "transform 0.1s ease-out",
      _hover: {
        transform: "scale(1.03)",
      }
    },
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') {
          return {
            bg: 'brand.accentOrange',
            color: 'white',
            _hover: { bg: 'brand.accentOrangeHover' }
          };
        }
        if (props.colorScheme === 'brandPrimary') {
            return {
              bg: 'brand.primaryDark',
              color: 'brand.textLight',
              _hover: {bg: 'blackAlpha.800'}
            };
        }
      },
      ghost: (props) => ({
        color: 'brand.textLight',
        _hover: { bg: 'whiteAlpha.200' }
      })
    },
  },
  Card: { // A new global style for any "card" elements
    baseStyle: {
        container: {
            bg: 'brand.secondary',
            color: 'brand.textLight', 
            borderRadius: 'xl',
            boxShadow: 'md',
        }
    }
  },
  Modal: {
    baseStyle: {
        dialog: {
            bg: 'brand.secondary',
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
        fontFamily: fonts.heading,
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
      },
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
