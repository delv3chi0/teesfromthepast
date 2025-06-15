import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A', // Main dark background (a deep teal/green)
    secondary: '#1B3B3A', // Header/darker background (slightly darker teal/green)

    cardBlue: '#F8DFA7', // The new light, warm card background (light beige/gold)

    accentOrange: '#D16930', // Vibrant orange
    accentOrangeHover: '#E17A45', // Slightly lighter orange for hover

    accentYellow: '#FFE9A0', // Light yellow for accents
    accentYellowHover: '#FDD97A', // Slightly darker yellow for hover

    textLight: '#FDF6EE', // Very light text, for use on dark backgrounds (primary, secondary, ui.background)
    textMuted: '#B7C4C4', // Muted text for subtle elements on dark backgrounds
    textDark: '#2A2A2A', // Dark text, for use on light backgrounds (like cardBlue, modals)
    textBurnt: '#3B2F1B', // Even darker, burnt-sienna like text for strong contrast on light elements

    // Adding a 'paper' color for the Tabs container in AdminPage, as you used it.
    // It seems you intend for this to be a light dark/muted background, not a bright card.
    paper: '#2D3748', // This color matches the 'ui.background' you previously had, providing a muted dark background
  },
  ui: {
    background: '#1E3A39', // General UI background, similar to primary
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
            bg: 'brand.cardBlue',
            color: 'brand.textDark', // Default color for text directly inside Card (e.g., a simple div)
            borderRadius: 'xl',
            boxShadow: 'lg',
            _dark: { // Apply these styles in dark mode (which is your initialColorMode)
                'h1, h2, h3, h4, h5, h6': { // Target all heading tags directly
                    color: 'brand.textBurnt !important', // Force headings to burnt
                    fontFamily: `${fonts.heading} !important`, // Force Bungee
                },
                'p': { // Target paragraph tags directly
                    color: 'brand.textDark !important', // Force paragraphs to dark
                    fontFamily: `${fonts.body} !important`, // Force Montserrat
                },
                'svg': {
                    color: 'brand.textBurnt !important', // Ensure SVGs within card are dark
                },
            }
        }
    }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      fontWeight: 'normal',
    },
    sizes: {
      pageTitle: {
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
        color: 'brand.textLight', // Explicitly light for page title on dark background
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
        bg: 'brand.secondary', // Use a dark background for modals
        color: 'brand.textLight', // Light text for dark modal background
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight'
      },
      footer: {
        borderTopWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }
    }
  },
  Button: {
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') {
          return {
            bg: 'brand.accentOrange',
            color: 'white',
            _hover: { bg: 'brand.accentOrangeHover' }
          };
        }
        if (props.colorScheme === 'brandAccentYellow') {
          return {
            bg: 'brand.accentYellow',
            color: 'brand.textDark',
            _hover: { bg: 'brand.accentYellowHover' }
          };
        }
        return {};
      }
    }
  },
  // NEW: Table Component Theming for text colors within Tables
  Table: {
    baseStyle: {
      th: { // Table Headers
        color: 'brand.textDark !important', // Force dark text for headers
        borderColor: 'rgba(0,0,0,0.1) !important', // Light border for tables on light cards
        textTransform: 'uppercase', // Often uppercase in tables
      },
      td: { // Table Data cells
        color: 'brand.textDark !important', // Force dark text for data cells
        borderColor: 'rgba(0,0,0,0.05) !important', // Lighter border for data cells
      },
      // You can add styles for table variants if you have custom ones
      // This will ensure proper contrast on light backgrounds (like brand.cardBlue)
    },
  },
  // NEW: Input component styling to ensure text is visible on its default white/light background
  Input: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark', // Text typed by user should be dark
          bg: 'whiteAlpha.900', // Set a background for inputs if not default
          borderColor: 'brand.textMuted', // Muted border
          _placeholder: {
            color: 'brand.textMuted', // Placeholder text color
          },
          _hover: {
            borderColor: 'brand.accentOrange', // Highlight on hover
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  // NEW: Select component styling
  Select: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark', // Text chosen by user should be dark
          bg: 'whiteAlpha.900', // Set a background for select if not default
          borderColor: 'brand.textMuted',
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  // NEW: FormLabel component styling
  FormLabel: {
    baseStyle: {
      color: 'brand.textDark', // Labels inside light cards should be dark
      mb: 1, // Add some margin bottom for spacing
    },
  },
  // NEW: Stat component styling to ensure its internal elements respect theme
  Stat: {
      baseStyle: {
          container: {
              // The StatCard component already explicitly used layerStyle="cardBlue",
              // but if you were using a plain <Stat> it would inherit from here.
              // We'll primarily rely on layerStyles.cardBlue and its child selectors.
          },
          label: {
              color: 'brand.textDark', // Ensure StatLabel is dark inside cards
          },
          number: {
              color: 'brand.textBurnt', // Ensure StatNumber is very dark inside cards
          }
      }
  }
};

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const layerStyles = {
  cardBlue: {
    bg: 'brand.cardBlue',
    color: 'brand.textDark', // Default text color for elements using this layer style
    borderRadius: 'xl',
    boxShadow: 'lg',
    p: 8,
    textAlign: 'center',
    borderWidth: '1px',
    borderColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.2s ease-in-out',
    _hover: {
      transform: 'translateY(-5px)',
      boxShadow: 'xl',
      borderColor: 'brand.accentYellow',
    },
    // Ensure headings and paragraphs within this layer style are also dark
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: 'brand.textBurnt !important', // Use textBurnt for headings on the light card background
      fontFamily: `${fonts.heading} !important`, // Make sure native headings use Bungee
    },
    '& p, & div, & span': { // Broaden this to include more generic text containers
      color: 'brand.textDark !important', // Use textDark for paragraphs on the light card background
      fontFamily: `${fonts.body} !important`, // Make sure native paragraphs use Montserrat
    },
    '& svg': {
      color: 'brand.textBurnt !important', // Ensure SVGs within this layer are dark
    },
    // Also include specific Chakra components if you expect them inside this layerStyle,
    // though the baseStyle for Input/Select/FormLabel should handle these.
  },
};

const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  layerStyles,
  styles: {
    global: {
      body: {
        bg: 'brand.primary',
        color: 'brand.textLight',
      },
      a: {
        color: 'brand.accentYellow',
        _hover: {
          textDecoration: 'underline',
        },
      },
    },
  },
});

export default theme;
