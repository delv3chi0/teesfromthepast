import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#2D2A26',
    primaryLight: '#4A443E',
    primaryDark: '#1A1A1A',
    secondary: '#A1887F', // Tan header
    accentOrange: '#FF7043',
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFEE58',
    accentYellowHover: '#FDD835',
    cardBlue: '#2c3e50', // New Navy Blue
    paper: '#F5F5F0', 
    textLight: '#E8E6E3',
    textDark: '#3E2723',
  },
};

const fonts = { /* Unchanged */ };

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
  Modal: {
      baseStyle: {
          dialog: {
              bg: 'brand.cardBlue',
              color: 'brand.textLight'
          },
          header: {
              color: 'brand.textLight'
          },
          body: {
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
  Text: {
    baseStyle: {
      fontFamily: 'body',
      color: 'brand.textLight',
      lineHeight: 'tall',
    },
  },
  Button: { /* Unchanged */ },
};

const config = { initialColorMode: 'dark', useSystemColorMode: false };

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
