// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#5D4037',        // Dark Brown (for sidebar)
    primaryLight: '#795548',   
    primaryDark: '#4E342E',    

    secondary: '#A1887F',      // Light Brown (for top bar)
    
    accentOrange: '#FF7043',   // Vibrant retro orange (for main body background)
    accentOrangeHover: '#F4511E', 

    accentYellow: '#FFEE58',   // Warm retro yellow (for accents/active links)
    accentYellowHover: '#FDD835', 

    paper: '#FFFFFF',          // White (for cards/sections on top of orange bg)
    bgLight: '#F5F5F5',        // A very light warm gray/off-white (alternative panel color)

    textDark: '#3E2723',       // Very dark brown (for text on light/paper backgrounds)
    textLight: '#FFFFFF',      // White (for text on dark/orange backgrounds)
    textMutedOnOrange: '#FFE0B2', // A light peach/orange for muted text on orange bg (example)
  },
  darkBackground: '#2D2A26' // For potential dark mode later
};

const fonts = {
  heading: `'Righteous', cursive`,
  body: `'Montserrat', sans-serif`,
};

const components = {
  Button: {
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') { 
          return {
            bg: 'brand.accentOrange', 
            color: 'brand.textLight', 
            _hover: { bg: 'brand.accentOrangeHover', _disabled: { bg: 'brand.accentOrange' } }, // ensure hover has _disabled too
            _active: { bg: 'brand.accentOrangeHover' }
          };
        }
        if (props.colorScheme === 'brandAccentYellow') {
            return {
                bg: 'brand.accentYellow',
                color: 'brand.textDark', 
                _hover: {bg: 'brand.accentYellowHover', _disabled: { bg: 'brand.accentYellow' } },
                _active: {bg: 'brand.accentYellowHover'}
            }
        }
        return {}; 
      },
    },
  },
  Heading: {
    baseStyle: (props) => ({ 
      fontFamily: 'heading',
      // Default color for headings will be white on orange body, dark on paper/light BGs
      color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.textLight', 
    }),
  },
  Text: {
    baseStyle: (props) => ({
      fontFamily: 'body',
      // Default color for text will be white on orange body
      color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.textLight',
    }),
  },
  Link: { 
    baseStyle: (props) => ({ // Links should contrast with the orange body
      color: props.colorMode === 'dark' ? 'brand.accentYellow' : 'brand.accentYellow', 
      _hover: {
        textDecoration: 'underline',
        color: props.colorMode === 'dark' ? 'brand.accentYellowHover' : 'brand.accentYellowHover',
      },
    }),
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
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? colors.darkBackground : colors.brand.accentOrange, 
        color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textLight, // Default text white on orange
      },
    }),
  },
});

export default theme;
