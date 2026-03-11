import { createTheme, createBox, createText } from '@shopify/restyle';

const palette = {
  purpleDark: '#4A148C',
  white: '#FFFFFF',
  black: '#000000',
  deepVolite: '#330066',
  transparentWhite: 'rgba(255, 255, 255, 0.2)',
  inputBackground: 'rgba(255, 255, 255, 0.60)',
  grey: '#808080',
  glassContainer: 'rgba(255,0,128,0.3)',
  transparentPurple: 'rgba(0, 0, 0, 0.5)',
  transparentWhite1: 'rgba(255,255,255,0.5)',
  
  // NEW NEON COLORS ADDED HERE
  neonPurple: '#BF40BF',
  electricBlue: '#00FFFF',
  deepInk: '#0D0214',
  accentPurple: '#6A0DAD',
  purple: '#800080', // ✅ Add purple
};

export const theme = createTheme({
  colors: {
    mainBackground: palette.purpleDark,
    white: palette.white,
    black: palette.black,
    deepVolite: palette.deepVolite,
    cardPrimaryBackground: palette.transparentWhite,
    inputBackground: palette.inputBackground,
    textPrimary: palette.white,
    tarnsparentWhite: palette.transparentWhite,
    grey: palette.grey,
    glassContainer: palette.glassContainer,
    transparentPurple: palette.transparentPurple,
    transparentWhite1: palette.transparentWhite1,
    neonPurple: palette.neonPurple,
    electricBlue: palette.electricBlue,
    deepInk: palette.deepInk,
    accentPurple: palette.accentPurple,
    purple: palette.purple, // ✅ Add purple
  },
  spacing: {
    xs: 4,   // ✅ Add xs (extra small)
    s: 8,    
    m: 16,   
    l: 24,   
    xl: 40,
    xxl: 64, // ✅ Add xxl (optional, for larger gaps)
  },
  textVariants: {
    defaults: {
      fontSize: 16,
      color: 'textPrimary',
    },
    header: {
      fontSize: 34, 
      fontWeight: 'bold', 
      color: 'textPrimary',
    },
    body: {
      fontSize: 16, 
      color: 'textPrimary',
    },
  },
  breakpoints: { 
    phone: 0, 
    tablet: 768 
  },
});

export type Theme = typeof theme;

export const Box = createBox<Theme>();
export const Text = createText<Theme>();
