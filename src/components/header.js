import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { color } from 'styled-system';
import { StaticImage } from 'gatsby-plugin-image';
import { Link } from 'gatsby';

import ThemeSwitch from './themeSwitch';

const Wrapper = styled(motion.header)`
  ${color}
  width: 100%;
  // TODO: Make height a var
  height: 80px;

  position: fixed;
  top: 0;

  min-width: 330px;

  /*
    // TODO: Auto-hide header
    (If scrolled to top, above styles apply)
    If scrolling up and not scrolled to top, stay visible
    If scrolling down and not scrolled to top, translateY height * -1
  */
  
  @media (min-width: 834px) {
    // TODO: Make height a var
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
  min-width: 48px;
  border-radius: 10px;
  overflow: hidden;
  // Safari border-radius fix
  transform: translateZ(0);

  &:hover {
    transform: scale(1.1) rotate(-10deg);
  }

  @media (min-width: 834px) {
    height: 54px;
    width: 54px;
  }

`;

const NavbarMobile = styled.nav`
  width: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
  transform: translateX(
    ${(props) => (props.open ? '0px' : `${props.clientWidth - 40}px`)}
  );
  transition: transform 0.3s ease-out;

  @media (min-width: 535px) {
    display: none;
  }
`;

const NavbarDesktop = styled.nav`
  width: 375px;
  display: none;
  justify-content: space-between;
  align-items: center;
  
  @media (min-width: 535px) {
    display: flex;
  }
  `;

const NavbarButton = styled.div`
  font-size: 48px;
  color: inherit;
  margin-left: 16px;
  line-height: 0px;
  transform: rotate(${(props) => (props.open ? '-180deg' : '0deg')});
  transition: transform 0.5s ease-out;
  cursor: pointer;
`;

const NavbarItem = styled.div`
  color: inherit;
  text-decoration: none;
  height: 21px;

  &:hover {
    text-decoration: underline;
    transform: translateY(-3px);
    color: ${(props) => props.theme.colors.textPrimary};
  }
`;

const Header = ({
  // eslint-disable-next-line no-shadow
  currentTheme, handleTheme, themeOptions, backgroundColor, color
}) => {
  const [navbarWidth, setNavbarWidth] = useState();
  useEffect(() => {
    setNavbarWidth(document.getElementById('mobile-nav').offsetWidth);
  }, []);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleResize = () => {
    setNavbarWidth(document.getElementById('mobile-nav').offsetWidth);
  };

  window.addEventListener('resize', handleResize);
  return (
    <Wrapper backgroundColor={backgroundColor} color={color} layout>
      <Content>
        <ImageContainer>
          <Link to="/">
            <StaticImage src="../images/Icon-Avatar.png" alt="logo" placeholder="blurred" layout="constrained" />
          </Link>
        </ImageContainer>
        <NavbarMobile id="mobile-nav" open={isOpen} clientWidth={navbarWidth}>
          <NavbarButton open={isOpen} onClick={() => setIsOpen(!isOpen)}>
            &#60;
          </NavbarButton>
          <NavbarItem as={Link} to="/projects">Projects</NavbarItem>
          <NavbarItem as={Link} to="">Résumé</NavbarItem>
          <ThemeSwitch currentTheme={currentTheme} themeOptions={themeOptions} handleTheme={handleTheme} />
        </NavbarMobile>
        <NavbarDesktop>
          <NavbarItem as={Link} to="/projects">Projects</NavbarItem>
          <NavbarItem as={Link} to="">Résumé</NavbarItem>
          <ThemeSwitch currentTheme={currentTheme} themeOptions={themeOptions} handleTheme={handleTheme} />
        </NavbarDesktop>
      </Content>
    </Wrapper>
  );
};

Header.propTypes = {
  backgroundColor: PropTypes.string,
  color: PropTypes.string,
  currentTheme: PropTypes.string,
  handleTheme: PropTypes.func,
  themeOptions: PropTypes.array,
};

Header.defaultProps = {
  backgroundColor: 'paper',
  color: 'textSecondary'
};

export default Header;
