import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled, { ThemeProvider } from 'styled-components';
import { color } from 'styled-system';
import merge from 'lodash.merge';
import get from 'lodash.get';
import { motion, AnimatePresence } from 'framer-motion';

import getUserColorScheme from '../hooks/getUserColorScheme';
import getLocalStorage from '../hooks/getLocalStorage';
import Seo from '../components/seo';
import Header from '../components/header';
import Footer from '../components/footer';
import baseTheme from '../themes/theme';
import GlobalStyle from './globalStyle';

// Modes listed here must match a mode in theme.js
const modes = [
  'dark',
  'light',
  'night'
];

const getTheme = (mode) => merge({}, baseTheme, {
  colors: get(baseTheme.colors.modes, mode, baseTheme.colors),
});

const Wrapper = styled(motion.main)`
  ${color}
  min-height: 100vh;
  width: 100vw;
`;

const MainLayout = ({
  children,
  title,
  description,
  image,
  path,
}) => {
  // Check localStorage for theme, otherwise use user's default color scheme (defaults to 'dark')
  const [currentTheme, setCurrentTheme] = useState(getLocalStorage('theme') || getUserColorScheme());
  const theme = getTheme(currentTheme);

  return (
    <>
      <Seo title={title} description={description} image={image} path={path} />
      <GlobalStyle />
      <ThemeProvider theme={theme}>
        <Header currentTheme={currentTheme} handleTheme={setCurrentTheme} themeOptions={modes} />
        <Wrapper backgroundColor="background">
          {children}
        </Wrapper>
        <Footer />
      </ThemeProvider>
    </>
  );
};

MainLayout.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  path: PropTypes.string,
};

export default MainLayout;
