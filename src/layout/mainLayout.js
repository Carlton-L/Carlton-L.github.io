import React, { useState } from 'react';
import { ThemeProvider } from 'styled-components';
import merge from 'lodash.merge';
import get from 'lodash.get';
import getUserColorScheme from '../hooks/getUserColorScheme';
import getLocalStorage from '../hooks/getLocalStorage';
import Seo from '../components/seo';
import Header from '../components/header';
import baseTheme from '../themes/theme';
import GlobalStyle from './globalStyle';

// Modes listed here must match a mode in theme.js
const modes = [
  'dark',
  'light'
];

const getTheme = (mode) => merge({}, baseTheme, {
  colors: get(baseTheme.colors.modes, mode, baseTheme.colors),
});

const MainLayout = ({
  children,
  title = false,
  description = false,
  image = false,
  path = false,
  props,
}) => {
  // Check localStorage for theme, otherwise use user's default color scheme (defaults to 'dark')
  const [currentTheme, setCurrentTheme] = useState(getLocalStorage('theme') || getUserColorScheme());
  const theme = getTheme(currentTheme);

  return (
    <>
      <Seo title={title} description={description} image={image} path={path} />
      <GlobalStyle />
      <ThemeProvider theme={theme}>
        <Header handleTheme={setCurrentTheme} themeOptions={modes} />
        {children}
      </ThemeProvider>
    </>
  );
};

export default MainLayout;
