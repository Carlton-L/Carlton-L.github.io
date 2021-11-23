import React from 'react';
import styled from 'styled-components';
import { color, background } from 'styled-system';
import { StaticImage } from 'gatsby-plugin-image';
import { Link } from 'gatsby';

import ThemeSwitch from './themeSwitch';

const Wrapper = styled.header`
  ${color}
  width: 100%;
  height: 80px;
  
  @media (min-width: 834px) {
    height: 100px;
  }
  `;

const Content = styled.div`
  max-width: 1200px;
  margin: auto;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  
  @media (min-width: 834px) {
    padding: 24px;
  }
  `;

const ImageContainer = styled.div`
  height: 48px;
  width: 48px;
  border-radius: 10px;
  overflow: hidden;
  // Safari border-radius fix
  transform: translateZ(0);

  @media (min-width: 834px) {
    height: 54px;
    width: 54px;
  }

`;

const NavbarMobile = styled.nav`
  width: auto;
  align-items: center;
  display: flex;

  @media (min-width: 834px) {
    display: none;
  }
`;

const NavbarDesktop = styled.nav`
  width: 375px;
  display: none;
  justify-content: space-between;
  align-items: center;
  
  @media (min-width: 834px) {
    display: flex;
  }
  `;

const NavbarItem = styled.div`
  color: inherit;
  text-decoration: none;
  height: 21px;

  &:hover {
    text-decoration: underline;
  }
`;

const Header = ({
  currentTheme, handleTheme, themeOptions, backgroundColor, color
}) => (
  <Wrapper backgroundColor={backgroundColor} color={color}>
    <Content>
      <ImageContainer>
        <Link to="/">
          <StaticImage src="../images/Icon-Avatar.png" alt="logo" placeholder="blurred" layout="constrained" />
        </Link>
      </ImageContainer>
      <NavbarMobile>
        <NavbarItem as={Link} to="">Projects</NavbarItem>
        <NavbarItem as={Link} to="">Résumé</NavbarItem>
        <ThemeSwitch currentTheme={currentTheme} themeOptions={themeOptions} handleTheme={handleTheme} />
      </NavbarMobile>
      <NavbarDesktop>
        <NavbarItem as={Link} to="">Projects</NavbarItem>
        <NavbarItem as={Link} to="">Résumé</NavbarItem>
        <ThemeSwitch currentTheme={currentTheme} themeOptions={themeOptions} handleTheme={handleTheme} />
      </NavbarDesktop>
    </Content>
  </Wrapper>
);

Header.defaultProps = {
  backgroundColor: 'paper',
  color: 'textSecondary'
};

export default Header;
