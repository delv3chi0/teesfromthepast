import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A', // Main dark background (a deep teal/green)
    secondary: '#1B3B3A', // Header/darker background (slightly darker teal/green), used for modal backgrounds
    cardBlue: '#F8DFA7', // The new light, warm card background (light beige/gold)

    accentOrange: '#D16930', // Vibrant orange
    accentOrangeHover: '#E17A45', // Slightly lighter orange for hover

    accentYellow: '#FFE9A0', // Light yellow for accents
    accentYellowHover: '#FDD97A', // Slightly darker yellow for hover

    textLight: '#FDF6EE', // Very light text, for use on dark backgrounds (primary, secondary, ui.background, MODALS)
    textMuted: '#B7C4C4', // Muted text for subtle elements on dark backgrounds
    textDark: '#2A2A2A', // Dark text, for use on light backgrounds (like cardBlue, INPUT FIELDS)
    textBurnt: '#3B2F1B', // Even darker, burnt-sienna like text for strong contrast on light elements

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
            color: 'brand.textDark', // Default color for text directly inside Card
            borderRadius: 'xl',
            boxShadow: 'lg',
            _dark: {
                'h1, h2, h3, h4, h5, h6': {
                    color: 'brand.textBurnt !important',
                    fontFamily: `${fonts.heading} !important`,
                },
                'p': {
                    color: 'brand.textDark !important',
                    fontFamily: `${fonts.body} !important`,
                },
                'div:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
                  color: 'brand.textDark !important', // Target generic divs
                },
                'span:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
                  color: 'brand.textDark !important', // Target generic spans
                },
                'svg': {
                    color: 'brand.textBurnt !important',
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
        color: 'brand.textLight',
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
        bg: 'brand.secondary',
        color: 'brand.textLight', // Ensures all text directly in modal content is light by default
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight', // Explicitly setting for modal body content
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
  Table: {
    baseStyle: {
      th: {
        color: 'brand.textDark !important',
        borderColor: 'rgba(0,0,0,0.1) !important',
        textTransform: 'uppercase',
      },
      td: {
        color: 'brand.textDark !important',
        borderColor: 'rgba(0,0,0,0.05) !important',
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark', // Text typed by user should be dark
          bg: 'whiteAlpha.900', // <--- Set a light background for input fields
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
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
  Select: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark', // Text chosen by user should be dark
          bg: 'whiteAlpha.900', // <--- Set a light background for select fields
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
  Textarea: { // NEW: Add Textarea theming
    variants: {
      outline: {
        field: {
          color: 'brand.textDark', // Text typed by user should be dark
          bg: 'whiteAlpha.900', // <--- Set a light background for textarea fields
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
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
  NumberInput: { // NEW: Add NumberInput theming
    variants: {
      outline: {
        field: {
          color: 'brand.textDark', // Text typed by user should be dark
          bg: 'whiteAlpha.900', // <--- Set a light background for number input fields
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
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
  FormLabel: {
    baseStyle: {
      // REMOVED: color: 'brand.textDark'. This allows it to inherit from parent.
      // In modals (dark background), it will inherit brand.textLight.
      // In light cards, it will inherit brand.textDark from the card's baseStyle.
      mb: 1,
    },
  },
  Stat: {
      baseStyle: {
          label: {
              color: 'brand.textDark',
          },
          number: {
              color: 'brand.textBurnt',
          }
      }
  },
  Accordion: { // New theming for Accordion component used in ProductManager modal
    baseStyle: {
      container: {
        // No explicit background here, let individual AccordionItem control it
        borderWidth: '0 !important', // Remove default Chakra accordion borders
      },
      button: {
        // The AccordionButton's background is controlled by its parent AccordionItem
        // Text color should inherit from the AccordionItem's background color
        _hover: {
          bg: 'whiteAlpha.100', // Subtle hover on dark background
        },
      },
      panel: {
        // Panel background is set in JSX (brand.secondary), text should inherit light
      },
    },
  },
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
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: 'brand.textBurnt !important',
      fontFamily: `${fonts.heading} !important`,
    },
    '& p, & div:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component]), & span:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
      color: 'brand.textDark !important',
      fontFamily: `${fonts.body} !important`,
    },
    '& svg': {
      color: 'brand.textBurnt !important',
    },
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
