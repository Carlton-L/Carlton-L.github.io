import React, { useEffect, useState } from 'react';

import baseTheme from '../themes/theme';
import setLocalStorage from '../hooks/setLocalStorage';

import Button from './button';

const getNextTheme = (currentTheme, themeOptions) => {
  // Find the index of the current theme, add 1 to find the next index
  const nextIndex = themeOptions.indexOf(currentTheme) + 1;
  // If the next index value is longer than the length of the array, re-start the count
  return nextIndex >= themeOptions.length ? themeOptions[0] : themeOptions[nextIndex];
};

const ThemeSwitch = ({ currentTheme, themeOptions, handleTheme }) => {
  const [nextTheme, setNextTheme] = useState('dark');

  // NOTE: useEffect must be used here due to React hydration and ssr
  useEffect(() => {
    setNextTheme(getNextTheme(currentTheme, themeOptions));
  });
  // setLocalStorage(nextTheme);
  return (
    <Button
      css={`
      &:hover {
        background-color: ${baseTheme.colors.modes[nextTheme].background};
      }
    `}
      color={baseTheme.colors.modes[nextTheme].textPrimary}
      backgroundColor={baseTheme.colors.modes[nextTheme].paper}
      onClick={() => {
        // Set the theme in state of MainLayout
        handleTheme(nextTheme);
        // Set the theme in localStorage
        setLocalStorage('theme', nextTheme);
        // Update the button with the next theme in the queue
        setNextTheme(getNextTheme(nextTheme, themeOptions));
      }}
      variant="small"
    >
      {nextTheme}
    </Button>
  );
};

export default ThemeSwitch;
