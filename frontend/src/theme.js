import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A',
    secondary: '#1B3B3A',

    cardBlue: '#F8DFA7',         // Retro buff for card backgrounds

    accentOrange: '#D16930',
    accentOrangeHover: '#E17A45',

    accentYellow: '#FFE9A0',
    accentYellowHover: '#FDD97A',

    textLight: '#FDF6EE',
    textMuted: '#B7C4C4',
    textDark: '#2A2A2A',          // Best for body text on light bg
    textBurnt: '#3B2F1B',         // Great for headers/icons on light bg
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
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
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
      lineHeight: 'tall',
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'brand.ui.background',
        color: 'brand.textLight',
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight',
      },
      footer: {
        borderTopWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
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

      // 💡 AUTO-FIX for any card with cardBlue (buff) background
      '[style*="background-color: rgb(248, 223, 167)"]': {
        color: '#2A2A2A !important', // body text
      },
      '[style*="background-color: rgb(248, 223, 167)"] h1, \
       [style*="background-color: rgb(248, 223, 167)"] h2, \
       [style*="background-color: rgb(248, 223, 167)"] h3': {
        color: '#3B2F1B !important', // heading text
      },
      '[style*="background-color: rgb(248, 223, 167)"] p': {
        color: '#2A2A2A !important', // body text
      },
      '[style*="background-color: rgb(248, 223, 167)"] svg': {
        color: '#3B2F1B !important', // icon color
      },
    },
  },
});

export default theme;
