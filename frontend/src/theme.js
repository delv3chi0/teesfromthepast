// frontend/src/theme.js (Temporary Minimal Test Theme)
import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'red.500', // A very obvious, bright red background
        color: 'white',   // White text
      },
    },
  },
  fonts: {
    heading: 'Arial, sans-serif', // Force a very standard, different font
    body: 'Verdana, sans-serif',   // Force a very standard, different font
  },
  colors: {
    brand: { // Keep a minimal brand object so App.jsx doesn't break if it references it
      primary: 'blue.500', 
    }
  }
});

export default theme;
