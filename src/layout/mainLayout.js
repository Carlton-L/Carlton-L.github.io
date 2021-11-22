import React, { useCallback, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import getUserColorScheme from '../hooks/getUserColorScheme';
import Seo from '../components/seo';
import Header from '../components/header';
import Footer from '../components/footer';
import Themes from '../themes/themes';
import GlobalStyle from './globalStyle';

const MainLayout = ({
  children,
  title = false,
  description = false,
  image = false,
  path = false,
  props,
}) => {
  const [currentTheme, setCurrentTheme] = useState(getUserColorScheme());
  const getOppositeTheme = useCallback(
    () => ((currentTheme === 'light') ? 'dark' : 'light'),
    [currentTheme],
  );
  return (
    <>
      <Seo title={title} description={description} image={image} path={path} />
      <GlobalStyle />
      <ThemeProvider theme={Themes[currentTheme]}>
        <Header handleTheme={() => setCurrentTheme(getOppositeTheme())} />
        {children}
        <Footer />
      </ThemeProvider>
    </>
  );
};

export default MainLayout;
