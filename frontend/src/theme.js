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
    paper: '#FFFFFF',          
    bgLight: '#F5F5F5',        
    textDark: '#3E2723',       
    textLight: '#FFFFFF',      
    textTeal: '#00796B',       // Our Teal color
    textMutedOnOrange: '#FFE0B2', 
  },
  darkBackground: '#2D2A26'
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
        return {}; 
      },
    },
  },
  Heading: {
    baseStyle: (props) => ({ 
      fontFamily: 'heading',
      color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.textTeal', // <-- UPDATED to textTeal for light mode
    }),
  },
  Text: { // Body text will still default to textTeal due to global body style below
    baseStyle: (props) => ({
      fontFamily: 'body',
      color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.textTeal', // UPDATED to textTeal for light mode
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
        color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textTeal, // Body text defaults to teal
      },
    }),
  },
});

export default theme;
