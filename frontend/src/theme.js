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
        color: 'brand.textLight', // Global text color for direct children of ModalContent
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight', // Explicitly setting for modal body content
        // NEW: Target FormLabels and Headings specifically within the modal body
        'label': { // Target all FormLabel elements
            color: 'brand.textLight !important', // Force them to be light
        },
        'h1, h2, h3, h4, h5, h6': { // Target all Heading elements
            color: 'brand.textLight !important', // Force them to be light
        },
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
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
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
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
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
  Textarea: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
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
  NumberInput: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
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
      // Removed color here, as it's handled by Modal.body's explicit selector for labels
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
  Accordion: {
    baseStyle: {
      container: {
        borderWidth: '0 !important',
      },
      button: {
        _hover: {
          bg: 'whiteAlpha.100',
        },
      },
      panel: {},
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
