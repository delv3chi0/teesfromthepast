// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#5D4037',        // Dark Brown (e.g., for sidebar)
    primaryLight: '#795548',   
    primaryDark: '#4E342E',    
    secondary: '#A1887F',      // Light Brown (e.g., for top bar)
    accentOrange: '#FF7043',   // Vibrant retro orange (main body background)
    accentOrangeHover: '#F4511E', 
    accentYellow: '#FFEE58',   // Warm retro yellow (for accents/active links)
    accentYellowHover: '#FDD835', 
    paper: '#FFFFFF',          // White (for cards/sections on top of orange bg)
    bgLight: '#F5F5F5',        // Very light warm gray (not currently used as main bg)
    textDark: '#3E2723',       // Very dark brown (for text on light/paper backgrounds)
    textLight: '#FFFFFF',      // White (for text on dark/orange backgrounds)
    textTeal: '#00796B',       // Retro Teal (current text on orange)
    textMutedOnOrange: '#FFE0B2', 
  },
  darkBackground: '#2D2A26'
};

const fonts = {
  heading: `'Bungee', cursive`, // <-- UPDATED to Bungee
  body: `'Montserrat', sans-serif`,
};

const components = {
  Button: {
    baseStyle: { // Add some default padding to all buttons
      px: 6, // py is often controlled by 'size' prop, but px can be defaulted
      borderRadius: "md", // Default to slightly rounded, can be overridden to 'full'
    },
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') { 
          return {
            bg: 'brand.accentOrange', 
            color: 'brand.textLight', 
            _hover: { bg: 'brand.accentOrangeHover', _disabled: { bg: 'brand.accentOrange' } },
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
        // Add a general "brandPrimary" for dark brown buttons
        if (props.colorScheme === 'brandPrimary') {
            return {
                bg: 'brand.primary',
                color: 'brand.textLight',
                _hover: {bg: 'brand.primaryLight', _disabled: {bg: 'brand.primary'}},
                _active: {bg: 'brand.primaryDark'}
            }
        }
        return {}; 
      },
    },
  },
  Heading: {
    baseStyle: (props) => ({ 
      fontFamily: 'heading', // Will now use Bungee
      color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.textTeal', 
      // Consider if brand.textTeal is still desired for headings on orange, or if brand.textDark/Light is better
    }),
  },
  Text: {
    baseStyle: (props) => ({
      fontFamily: 'body',
      color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.textTeal',
    }),
  },
  Link: { 
    baseStyle: (props) => ({ 
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
        color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textTeal,
      },
    }),
  },
});

export default theme;
