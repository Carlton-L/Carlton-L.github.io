import React, { useState } from 'react';
import styled from 'styled-components';

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

/*
Know what the current theme is
Know what the next theme is
Get the index of the current theme, add 1, if it equals array.length(), set to 0, else set to current +1
themeOptions.indexOf(currentTheme)+1 >== themeOptions.length() ? 0 : themeOptions.indexOf(currentTheme)+1
*/
