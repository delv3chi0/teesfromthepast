import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A',           // Deep teal background
    secondary: '#1B3B3A',         // Slightly darker header/nav

    cardBlue: '#F8DFA7',          // ✅ Buff retro card color
    cardBuff: '#F8DFA7',          // Optional alias
    cardGold: '#F1C666',          // Optional alt card tone

    accentOrange: '#D16930',
    accentOrangeHover: '#E17A45',

    accentYellow: '#FFE9A0',
    accentYellowHover: '#FDD97A',

    textLight: '#FDF6EE',         // For dark backgrounds
    textMuted: '#B7C4C4',
    textDark: '#2A2A2A',          // For use on light backgrounds
    textBurnt: '#3B2F1B',         // ✅ For high contrast on buff
  },
  ui: {
    background: '#1E3A39',
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
        bg: 'brand.cardBlue',       // Using updated buff color
        color: 'brand.textBurnt',
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
