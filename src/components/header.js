import React from 'react';
import styled from 'styled-components';
import { color, background } from 'styled-system';
import { StaticImage } from 'gatsby-plugin-image';
import { Link } from 'gatsby';

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

  @media (min-width: 834px) {
    height: 54px;
    width: 54px;
  }
`;

const NavbarMobile = styled.nav`
  width: auto;

  @media (min-width: 834px) {
    display: none;
  }
`;

const NavbarDesktop = styled.nav`
  width: 256px;
  display: none;
  justify-content: space-between;

  @media (min-width: 834px) {
    display: flex;
  }
`;

const NavbarItem = styled.div`
  color: inherit;
  text-decoration: none;
  height: 21px;
  align-self: center;

  &:hover {
    text-decoration: underline;
  }
`;

const Header = ({ handleTheme, themeOptions }) => (
  <Wrapper backgroundColor="paper" color="textSecondary">
    <Content>
      <ImageContainer>
        <StaticImage src="../images/Icon-Avatar.png" alt="logo" placeholder="blurred" layout="constrained" />
      </ImageContainer>
      <NavbarMobile>
        <NavbarItem as={Link} to="">Projects</NavbarItem>
        <NavbarItem as={Link} to="">Résumé</NavbarItem>
        {/* <ThemeSwitch themes={themeOptions} handleChange={handleTheme} /> */}
      </NavbarMobile>
      <NavbarDesktop>
        <NavbarItem as={Link} to="">Projects</NavbarItem>
        <NavbarItem as={Link} to="">Résumé</NavbarItem>
        {/* <ThemeSwitch themes={themeOptions} handleChange={handleTheme} /> */}
      </NavbarDesktop>
    </Content>
  </Wrapper>
);

export default Header;
