import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A',           // Deep teal background
    secondary: '#1B3B3A',         // Slightly darker header/nav

    cardBlue: '#FFE9A0',          // ✅ Re-added and set to tan
    cardTan: '#FFE9A0',           // Optional alias
    cardGold: '#F1C666',          // Optional alternate

    accentOrange: '#D16930',      // Muted burnt orange
    accentOrangeHover: '#E17A45',

    accentYellow: '#FFE9A0',      // Soft yellow-tan
    accentYellowHover: '#FDD97A',

    textLight: '#FDF6EE',         // Creamy white
    textMuted: '#B7C4C4',         // Muted gray-teal
    textDark: '#2A2A2A',          // For light backgrounds
  },
  ui: {
    background: '#1E3A39',        // For sections, modals
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
        bg: 'brand.cardTan',
        color: 'brand.textDark',
        borderRadius: 'xl',
        boxShadow: 'lg',
      },
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'brand.ui.background',
        color: 'brand.textLight'
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      },
      body: {
        color: 'brand.textLight'
      },
      footer: {
        borderTopWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)'
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
      pageTitle: {
        fontFamily: fonts.heading,
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: fonts.body,
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
            _hover: { bg: 'brand.accentOrangeHover' },
          };
        }
        if (props.colorScheme === 'brandAccentYellow') {
          return {
            bg: 'brand.accentYellow',
            color: 'brand.textDark',
            _hover: { bg: 'brand.accentYellowHover' },
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
