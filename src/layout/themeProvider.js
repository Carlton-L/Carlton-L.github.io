import React, { useState, useEffect } from 'react';
import { ThemeProvider } from 'styled-components';
import merge from 'lodash.merge';
import get from 'lodash.get';
// the full theme object
import baseTheme from '../themes/theme';

// merge the color mode with the base theme
// to create a new theme object
const getTheme = (mode, base) => (
  merge({}, base, {
    colors: get(base.colors.modes, mode, base.colors),
  })
);

export default ({ mode, children }) => {
  const [currentTheme, setCurrentTheme] = useState(getTheme('dark', baseTheme));
  useEffect(() => {
    const theme = getTheme(mode, baseTheme);
    setCurrentTheme(theme);
  });

  return (
    <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
  );
};
