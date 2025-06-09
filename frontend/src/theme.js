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
  heading: { // This is your general heading font definition
    base: "'Montserrat', sans-serif",
    md: "'Bungee', cursive"
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
    baseStyle: (props) => ({ // General base style for all headings
      fontFamily: {
        base: fonts.heading.base, // Montserrat on mobile
        md: fonts.heading.md      // Bungee on desktop
      },
      fontWeight: {
        base: 700,                // Bold for Montserrat
        md: 'normal'              // Normal for Bungee (it's inherently bold)
      },
      // Default color for headings (can be overridden by specific page title style)
      color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textLight,
    }),
    sizes: {
      // You can define other sizes like '2xl', 'xl', 'lg', 'md', 'sm', 'xs' here if needed,
      // or let Chakra's defaults apply for those.

      // --- NEW CUSTOM SIZE FOR PAGE TITLES ---
      'pageTitle': {
        fontSize: { base: '2xl', md: '3xl' }, // e.g., 24px on mobile, 30px on desktop
        fontFamily: fonts.body, // Consistently use 'Montserrat'
        fontWeight: 'bold',     // Ensure it's bold
        lineHeight: 'shorter',  // Good for multi-line titles
        // color: colors.brand.textLight, // You can set a default color here or on the component itself
                                        // For now, we'll set it on the component to ensure it uses textLight
                                        // against the accentOrange background.
      },
      // --- END NEW CUSTOM SIZE ---
    },
    // You could also create a variant, e.g., variant: 'pageTitle'
    // variants: {
    //   'pageTitle': {
    //      fontSize: { base: '2xl', md: '3xl' },
    //      fontFamily: fonts.body,
    //      fontWeight: 'bold',
    //      color: colors.brand.textLight, // Default color for this variant
    //      textAlign: 'left', // Default alignment
    //      mb: 6, // Default bottom margin
    //   }
    // }
  },
  Text: {
    baseStyle: (props) => ({
      fontFamily: 'body',
      color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textTeal,
    }),
  },
  Link: {
    baseStyle: {
      fontFamily: fonts.body,
      color: colors.brand.accentYellow,
      _hover: {
        textDecoration: 'underline',
        color: colors.brand.accentYellowHover,
      },
    },
  },
  Input: {
    baseStyle: {
      field: {
        fontFamily: 'body',
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
        fontFamily: fonts.body,
        bg: props.colorMode === 'dark' ? colors.darkBackground : colors.brand.accentOrange,
        color: props.colorMode === 'dark' ? colors.brand.textLight : colors.brand.textTeal,
      },
      'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active': {
        fontFamily: `${fonts.body} !important`,
      },
    }),
  },
  semanticTokens: {
    colors: {
      brandPrimary: {
        default: colors.brand.primary,
        _dark: colors.brand.primaryLight,
      },
    },
  },
});

export default theme;
