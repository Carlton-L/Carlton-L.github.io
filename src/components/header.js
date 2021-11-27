import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { color } from 'styled-system';
import { StaticImage } from 'gatsby-plugin-image';
import { Link } from 'gatsby';

import ThemeSwitch from './themeSwitch';

const Wrapper = styled(motion.header)`
  ${color}
  width: 100%;
  // TODO: Make height a var
  height: 80px;

  z-index: 150;
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

const ImageContainer = styled(motion.div)`
  height: 48px;
  width: 48px;
  min-width: 48px;
  border-radius: 10px;
  overflow: hidden;
  // Safari border-radius fix
  transform: translateZ(0);

  @media (min-width: 834px) {
    height: 54px;
    width: 54px;
  }

`;

const NavbarMobile = styled(motion.nav)`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-grow: 1;

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

const NavbarButton = styled(motion.div)`
  font-size: 48px;
  color: inherit;
  margin-left: 16px;
  line-height: 0px;
  transform: rotate(${(props) => (props.open ? '-180deg' : '0deg')});
  transition: transform 0.5s ease-out;
  cursor: pointer;
  `;

const NavbarItem = styled(motion.div)`
  color: inherit;
  text-decoration: none;
  height: 21px;
  
  &:hover {
    text-decoration: underline;
    transform: translateY(-3px);
    color: ${(props) => props.theme.colors.textPrimary};
  }
  `;

const NavbarList = styled(motion.div)`
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-grow: 1;
  margin-left: 16px;
  `;

const CloseButton = styled(motion.div)`
  cursor: pointer;
  transform: translateY(-5px);
  font-size: 48px;
`;

const Header = ({
  // eslint-disable-next-line no-shadow
  currentTheme, handleTheme, themeOptions, backgroundColor, color
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // TODO: Auto-hide header on scroll down
  return (
    <Wrapper backgroundColor={backgroundColor} color={color}>
      <Content>
        <AnimatePresence exitBeforeEnter initial={false}>
          {!isOpen && (
          <ImageContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Link to="/" onClick={() => setIsOpen(false)}>
              <StaticImage src="../images/Icon-Avatar.png" alt="logo" placeholder="blurred" layout="constrained" />
            </Link>
          </ImageContainer>
          )}
        </AnimatePresence>
        <NavbarMobile data-isOn={isOpen} id="mobile-nav" open={isOpen} layout>
          <AnimatePresence exitBeforeEnter initial={false}>
            {!isOpen && (
              <NavbarButton open={isOpen} onClick={() => setIsOpen(!isOpen)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                &#60;
              </NavbarButton>
            )}
            {isOpen && (
              <NavbarList id="someid" key="somekey" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} layout>
                <CloseButton onClick={() => setIsOpen(false)}>x</CloseButton>
                <NavbarItem as={Link} to="/projects" onClick={() => setIsOpen(false)}>Projects</NavbarItem>
                <NavbarItem as={Link} to="" onClick={() => setIsOpen(false)}>Résumé</NavbarItem>
                <ThemeSwitch currentTheme={currentTheme} themeOptions={themeOptions} handleTheme={handleTheme} />
              </NavbarList>
            )}
          </AnimatePresence>
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
