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

    subtleLightBg: 'rgba(0,0,0,0.05)', // A very faint black overlay for inner sections on light cards
  },
  ui: {
    background: '#1E3A39', // General UI background, similar to primary
  },
  green: { 50: '#F0FFF4', 100: '#C6F6D5', 200: '#9AE6B4', 300: '#68D391', 400: '#48BB78', 500: '#38A169', 600: '#2F855A', 700: '#276749', 800: '#22543D', 900: '#1C4532' },
  red: { 50: '#FFF5F5', 100: '#FED7D7', 200: '#FC8181', 300: '#E53E3E', 400: '#C53030', 500: '#9B2C2C', 600: '#822727', 700: '#63171B', 800: '#441C20', 900: '#2C1717' },
  gray: { 50: '#F7FAFC', 100: '#EDF2F7', 200: '#E2E8F0', 300: '#CBD5E0', 400: '#A0AEC0', 500: '#718096', 600: '#4A5568', 700: '#2D3748', 800: '#1A202C', 900: '#171923' },
  orange: { 50: '#FFFAF0', 100: '#FEEBC8', 200: '#FBD38D', 300: '#F6AD55', 400: '#ED8936', 500: '#DD6B20', 600: '#C05621', 700: '#9C4221', 800: '#7B341E', 900: '#652B1E' },
  blue: { 50: '#EBF8FF', 100: '#BEE3F8', 200: '#90CDF4', 300: '#63B3ED', 400: '#4299E1', 500: '#3182CE', 600: '#2B6CB0', 700: '#2C5282', 800: '#2A4365', 900: '#1A365D' },
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
            color: 'brand.textDark',
            borderRadius: 'xl',
            boxShadow: 'lg',
            _dark: {
                'h1, h2, h3, h4, h5, h6': {
                    color: 'brand.textBurnt !important',
                    fontFamily: `${fonts.heading} !important`,
                },
                'p, div:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component]), span:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
                    color: 'brand.textDark !important',
                    fontFamily: `${fonts.body} !important`,
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
            color: 'brand.textLight !important',
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
  Tag: {
    baseStyle: {
        container: {
            fontWeight: 'bold',
            borderRadius: 'full',
        },
    },
    variants: {
        subtle: (props) => ({
            container: {
                bg: `${props.colorScheme}.600`,
                color: 'white',
            }
        }),
        solid: (props) => ({
            container: {
                bg: `${props.colorScheme}.700`,
                color: 'white',
            }
        }),
        outline: (props) => ({
             container: {
                color: `${props.colorScheme}.600`,
                borderColor: `${props.colorScheme}.600`,
             }
        })
    },
    defaultProps: {
        variant: 'subtle',
    }
  },
  MenuList: {
    baseStyle: {
      bg: 'brand.cardBlue',
      color: 'brand.textDark', // Default text color for items (dark)
      borderColor: 'rgba(0,0,0,0.1)',
      boxShadow: 'lg',
    },
  },
  MenuItem: {
    baseStyle: {
      color: 'brand.textDark !important', // <--- Apply !important here
      _hover: {
        bg: 'brand.secondary',
        color: 'brand.textLight',
      },
      _focus: {
        bg: 'brand.secondary',
        color: 'brand.textLight',
      },
      // Specific styling for the Logout item
      '&[data-chakra-menu-item="true"][color="red.600"]': {
          color: 'red.600 !important', // <--- Also apply !important here
          _hover: {
              bg: 'red.800',
              color: 'white',
          },
          _focus: {
              bg: 'red.800',
              color: 'white',
          }
      }
    },
  },
  MenuDivider: {
    baseStyle: {
      borderColor: 'rgba(0,0,0,0.1)',
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
    color: 'brand.textDark',
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
  lightCardInnerSection: {
    bg: 'brand.subtleLightBg',
    color: 'brand.textDark',
    borderRadius: 'md',
    p: 4,
    borderWidth: '1px',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  darkModalInnerSection: {
    bg: 'brand.primary',
    color: 'brand.textLight',
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
