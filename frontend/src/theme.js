// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#5D4037',       // Dark Brown
    primaryLight: '#795548',
    primaryDark: '#4E342E',
    secondary: '#A1887F',      // Light Brown
    accentOrange: '#FF7043',   // Vibrant retro orange (main body background)
    accentOrangeHover: '#F4511E',
    accentYellow: '#FFEE58',   // Warm retro yellow (for accents/active links/buttons)
    accentYellowHover: '#FDD835',
    paper: '#FFFFFF',          // White (for cards/sections on top of orange bg)
    bgLight: '#F5F5F5',
    textDark: '#3E2723',       // Very dark brown (for text on light/paper/yellow backgrounds)
    textLight: '#FFFFFF',       // White (for text on dark/orange backgrounds)
    textTeal: '#00796B',       // Retro Teal (current default text on orange)
    textMutedOnOrange: '#FFE0B2',
  },
  darkBackground: '#2D2A26'
};

const fonts = {
  // MODIFIED: Heading font is now responsive
  heading: {
    base: "'Montserrat', sans-serif", // Montserrat for mobile (base breakpoint)
    md: "'Bungee', cursive"           // Bungee for desktop (md breakpoint and up)
  },
  body: "'Montserrat', sans-serif",
};

const components = {
  Button: {
    baseStyle: { px: 6, py: 3, borderRadius: "full", fontWeight: "bold", transition: "all 0.2s ease-in-out", _hover: { transform: "translateY(-2px)", boxShadow: "md",}},
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') return { bg: 'brand.accentOrange', color: 'brand.textLight', _hover: { bg: 'brand.accentOrangeHover', transform: "translateY(-2px) scale(1.01)", boxShadow: "lg", _disabled: { bg: 'brand.accentOrange' } }, _active: { bg: 'brand.accentOrangeHover', transform: "translateY(0px) scale(0.99)" } };
        if (props.colorScheme === 'brandAccentYellow') return { bg: 'brand.accentYellow', color: 'brand.textDark', _hover: {bg: 'brand.accentYellowHover', transform: "translateY(-2px) scale(1.01)", boxShadow: "lg", _disabled: { bg: 'brand.accentYellow' } }, _active: {bg: 'brand.accentYellowHover', transform: "translateY(0px) scale(0.99)"}};
        if (props.colorScheme === 'brandPrimary') return { bg: 'brand.primary', color: 'brand.textLight', _hover: {bg: 'brand.primaryLight', transform: "translateY(-2px) scale(1.01)", boxShadow: "lg", _disabled: {bg: 'brand.primary'}}, _active: {bg: 'brand.primaryDark', transform: "translateY(0px) scale(0.99)"}};
        return {bg: 'gray.200', color: 'gray.800', _hover: {bg: 'gray.300', transform: "translateY(-2px) scale(1.01)", boxShadow: "lg"}, _active: {bg: 'gray.400', transform: "translateY(0px) scale(0.99)"}};
      },
      outline: (props) => ({ borderColor: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.secondary', color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.secondary', _hover: { bg: props.colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.100', transform: "translateY(-2px) scale(1.01)", boxShadow: "lg"}}),
      ghost: (props) => ({ color: props.colorMode === 'dark' ? 'brand.textLight' : 'brand.secondary',_hover: { bg: props.colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.100', transform: "translateY(-2px) scale(1.01)",}})
    },
  },
  Heading: {
    baseStyle: (props) => ({
      fontFamily: {
        base: fonts.heading.base, // Use Montserrat for base
        md: fonts.heading.md      // Use Bungee for md and up
      },
      fontWeight: {
        base: 700,                // Explicitly 'bold' (700) for Montserrat on mobile
        md: 'normal'              // Bungee is inherently very bold
      },
      // Assuming headings on accentOrange background should be textLight
      color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textLight,
    }),
  },
  Text: {
    baseStyle: (props) => ({
      fontFamily: 'body', // This ensures Montserrat is used for Text components
      color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textTeal,
    }),
  },
  Link: {
    baseStyle: (props) => ({
      fontFamily: 'body', // Ensure links also use Montserrat
      color: props.colorMode === 'dark' ? colors.brand.accentYellow : colors.brand.accentYellow,
      _hover: { textDecoration: 'underline', color: props.colorMode === 'dark' ? colors.brand.accentYellowHover : colors.brand.accentYellowHover'},
    }),
  },
  Input: { // Added base style for Input to ensure font family
    baseStyle: {
      field: {
        fontFamily: 'body', // Ensures regular input state uses Montserrat
      },
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
    global: (props) => ({
      body: {
        fontFamily: fonts.body, // Sets Montserrat for the whole body
        bg: props.colorMode === 'dark' ? colors.darkBackground : colors.brand.accentOrange,
        color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textTeal, // Default body text color
      },
      // *** STYLES FOR AUTOFILL INPUTS ***
      'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active': {
        fontFamily: `${fonts.body} !important`, // Force Montserrat font
        // To control text color and background of autofilled inputs (optional):
        // Make sure the text color contrasts with your chosen autofill background.
        // The boxShadow trick is often the most reliable way to change the background.
        // '-webkit-text-fill-color': `${props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textDark} !important`, // Example: black text on light mode
        // boxShadow: `0 0 0px 1000px ${props.colorMode === 'dark' ? colors.brand.primaryDark : colors.brand.paper} inset !important`, // Example: paper white background
        // transition: 'background-color 5000s ease-in-out 0s', // Another trick to "delay" browser override
      },
      // For Firefox, ensuring the input's base font-family is set (as done in components.Input)
      // and sometimes this more generic selector helps, though its behavior can vary.
      // 'input:autofill': {
      //   fontFamily: `${fonts.body} !important`,
      // }
      // *** END OF AUTOFILL STYLES ***
    }),
  },
  // Adding semanticTokens for brandPrimary color scheme if used by Tabs or other components
  semanticTokens: {
    colors: {
      brandPrimary: { // Used by Tabs in AdminPage colorScheme
        default: colors.brand.primary,
        _dark: colors.brand.primaryLight,
      },
    },
  },
});

export default theme;
