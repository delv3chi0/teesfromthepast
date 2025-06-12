import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#1A1D22',       // The main dark background from your screenshot
    secondary: '#212428',     // Header background
    cardBlue: '#2c3e50',      // The navy blue for cards
    
    accentOrange: '#D95A2B', // The vibrant orange from your buttons
    accentOrangeHover: '#E86A3C',
    accentYellow: '#FFEE58',
    
    textLight: '#EAEAEA',      // The main off-white text color
    textMuted: '#949494',       // Muted gray for less important text
    textDark: '#1A1D22',       // Dark text for use on light backgrounds
  },
  // Added this ui color for solid panel backgrounds
  ui: {
      background: '#2D3748', // A solid, dark gray
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
            color: 'brand.textLight', 
            borderRadius: 'xl',
            boxShadow: 'lg',
        }
    }
  },
  // MODIFIED: Corrected the Modal component style
  Modal: {
      baseStyle: (props) => ({
          dialog: {
              bg: colors.brand.cardBlue, // Use the solid blue color
              color: 'brand.textLight'
          },
          header: {
              color: 'brand.textLight',
              borderBottomWidth: '1px',
              borderColor: 'rgba(255, 255, 255, 0.1)' // A subtle border color
          },
          body: {
              color: 'brand.textLight'
          },
          footer: {
              borderTopWidth: '1px',
              borderColor: 'rgba(255, 255, 255, 0.1)'
          }
      })
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
  Text: {
    baseStyle: {
      fontFamily: 'body',
      color: 'brand.textLight',
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
             if (props.colorScheme === 'brandAccentYellow') {
                return {
                    bg: 'brand.accentYellow',
                    color: 'brand.textDark',
                    _hover: { bg: '#FDD835' } // a slightly darker yellow
                };
            }
        }
    }
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
