// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#5D4037',         // Dark Brown
    primaryLight: '#795548',
    primaryDark: '#4E342E',
    secondary: '#A1887F',       // Light Brown
    accentOrange: '#FF7043',     // Vibrant retro orange
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFEE58',     // Warm retro yellow
    accentYellowHover: '#FDD835',
    paper: '#FFFFFF',           // White (for cards)
    bgLight: '#F7F7F7',          // NEW: Very light gray for main backgrounds
    textDark: '#3E2723',         // Very dark brown
    textLight: '#FFFFFF',         // White
  },
};

const fonts = {
  heading: "'Bungee', cursive", // Default heading font
  body: "'Montserrat', sans-serif", // Default body font
};

const components = {
  Button: {
    baseStyle: {
      borderRadius: "full",
      fontWeight: "bold",
      transition: "all 0.2s ease-in-out",
      _hover: { transform: "translateY(-2px)", boxShadow: "md" },
    },
    // Other button variants are fine
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      color: 'brand.textDark', // Headings are dark by default now
      fontWeight: 'normal', // Bungee is already bold
    },
    sizes: {
      'pageTitle': {
        fontFamily: fonts.heading, // All page titles use Bungee
        fontSize: { base: '3xl', md: '4xl' },
        color: 'brand.textDark',
        lineHeight: 'shorter',
        mb: 6, // Add some default margin below page titles
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: 'body',
      color: 'brand.textDark', // Default text is dark
    },
  },
  // Other component styles are fine
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
        fontFamily: fonts.body,
        bg: 'brand.bgLight', // Use the new light gray background globally
        color: 'brand.textDark',
      },
      'input:-webkit-autofill': {
        fontFamily: `${fonts.body} !important`,
      },
    },
  },
});

export default theme;
