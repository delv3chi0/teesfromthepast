// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#5D4037',
    primaryLight: '#795548',
    primaryDark: '#4E342E',
    secondary: '#A1887F',
    accentOrange: '#FF7043',
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFEE58',
    accentYellowHover: '#FDD835',
    paper: '#F5F5F0', // A subtle, off-white/cream for backgrounds
    cardBg: '#FFFFFF', // Pure white for cards
    textDark: '#3E2723',
    textLight: '#FFFFFF',
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
      color: 'brand.textDark',
      fontWeight: 'normal', // Bungee is already bold
    },
    sizes: {
      'pageTitle': {
        fontFamily: fonts.heading,
        fontSize: { base: '3xl', md: '4xl' },
        color: 'brand.textDark',
        lineHeight: 'shorter',
        mb: 6,
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: 'body',
      color: 'brand.textDark',
    },
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
        bg: 'brand.paper',
        color: 'brand.textDark',
      },
    },
  },
});

export default theme;
