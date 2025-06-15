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
    textBurnt: '#3B2F1B', // Even darker, burnt-sienna like text for strong contrast on light elements - NEW PRIMARY FOR HEADINGS ON LIGHT CARDS

    paper: '#2D3748', // This color matches the 'ui.background' you previously had, providing a muted dark background

    // NEW COLOR FOR TWO-TONE EFFECT ON LIGHT CARDS
    subtleLightBg: 'rgba(0,0,0,0.05)', // A very faint black overlay for inner sections on light cards
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
            color: 'brand.textDark', // Default color for text directly inside Card (for paragraph text, etc.)
            borderRadius: 'xl',
            boxShadow: 'lg',
            _dark: {
                // MODIFIED: Headings within light cards now use brand.textBurnt
                'h1, h2, h3, h4, h5, h6': {
                    color: 'brand.textBurnt !important',
                    fontFamily: `${fonts.heading} !important`,
                },
                // Body text and generic divs/spans within light cards use brand.textDark
                'p, div:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component]), span:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
                    color: 'brand.textDark !important',
                    fontFamily: `${fonts.body} !important`,
                },
                // Icons within light cards use brand.textBurnt
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
        color: 'brand.textLight', // Page title remains light (on dark primary background)
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
        color: 'brand.textLight',
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight',
        'label': {
            color: 'brand.textLight !important',
        },
        'h1, h2, h3, h4, h5, h6': {
            color: 'brand.textLight !important', // Headings in modals are light (on dark background)
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
    color: 'brand.textDark', // Default text color for direct children (e.g. paragraphs)
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
    // Headings within light cards now use brand.textBurnt (darker brown)
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: 'brand.textBurnt !important',
      fontFamily: `${fonts.heading} !important`,
    },
    // Body text/generic divs/spans within light cards use brand.textDark
    '& p, & div:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component]), & span:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
      color: 'brand.textDark !important',
      fontFamily: `${fonts.body} !important`,
    },
    // Icons within light cards use brand.textBurnt (darker brown)
    '& svg': {
      color: 'brand.textBurnt !important',
    },
  },
  // NEW: Layer style for inner sections within LIGHT cards (e.g., homepage feature cards)
  lightCardInnerSection: {
    bg: 'brand.subtleLightBg', // Subtle darker tone
    // Text colors within this will naturally inherit from parent Card's brand.textDark / brand.textBurnt
    borderRadius: 'md', // Small rounded corners for inner boxes
    p: 4, // Padding for content inside
    borderWidth: '1px',
    borderColor: 'rgba(0,0,0,0.1)', // Subtle border
  },
  // NEW: Layer style for inner sections within DARK modal backgrounds
  darkModalInnerSection: {
    bg: 'brand.primary', // Darkest brand color for contrast on brand.secondary
    // Text colors within this will naturally inherit from Modal's brand.textLight
    borderRadius: 'md',
    p: 4,
    borderWidth: '1px',
    borderColor: 'rgba(255,255,255,0.1)',
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
