import React, { useState } from 'react';

import baseTheme from '../themes/theme';
import setLocalStorage from '../hooks/setLocalStorage';

import Button from './button';

const getNextTheme = (currentTheme, themeOptions) => {
  const nextIndex = themeOptions.indexOf(currentTheme) + 1;
  return nextIndex >= themeOptions.length ? themeOptions[0] : themeOptions[nextIndex];
};

const ThemeSwitch = ({ currentTheme, themeOptions, handleTheme }) => {
  const [nextTheme, setNextTheme] = useState(getNextTheme(currentTheme, themeOptions));
  setLocalStorage(nextTheme);
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
        handleTheme(nextTheme);
        // setLocalStorage(nextTheme);
        setNextTheme(getNextTheme(nextTheme, themeOptions));
      }}
      variant="small"
    >
      {nextTheme}
    </Button>
  );
};

export default ThemeSwitch;
