import { createTheme, Theme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f8f3f2',
      paper: '#ffffff',
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

// Custom theme for the app
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      link: {
        normal: string;
        hover: string;
      };
    };
  }
  
  interface ThemeOptions {
    custom?: {
      link?: {
        normal?: string;
        hover?: string;
      };
    };
  }
} 