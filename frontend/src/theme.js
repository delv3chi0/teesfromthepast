import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A',
    secondary: '#1B3B3A',

    cardBlue: '#F8DFA7',         // Soft tan background for cards

    accentOrange: '#D16930',
    accentOrangeHover: '#E17A45',

    accentYellow: '#FFE9A0',
    accentYellowHover: '#FDD97A',

    textLight: '#FDF6EE',
    textMuted: '#B7C4C4',
    textDark: '#2A2A2A',
    textBurnt: '#3B2F1B',
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
      // 👇 Auto-style any container with bg=brand.cardBlue
      '[style*="background-color: rgb(248, 223, 167)"]': {
        color: 'brand.textDark !important',
      },
      '[style*="background-color: rgb(248, 223, 167)"] svg': {
        color: '#3B2F1B !important',
      },
      '[style*="background-color: rgb(248, 223, 167)"] h1, \
       [style*="background-color: rgb(248, 223, 167)"] h2, \
       [style*="background-color: rgb(248, 223, 167)"] h3': {
        color: '#3B2F1B !important',
      },
      '[style*="background-color: rgb(248, 223, 167)"] p': {
        color: '#2A2A2A !important',
      },
    },
  },
});

export default theme;
