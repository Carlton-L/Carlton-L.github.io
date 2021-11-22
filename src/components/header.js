import React from 'react';
import styled from 'styled-components';
import { StaticImage } from 'gatsby-plugin-image';
import { Link } from 'gatsby';

const HeaderContainer = styled.header`
  background-color: ${(props) => props.theme.background.paper};
  color: ${(props) => props.theme.text.secondary};
  width: auto;
  height: 80px;
  padding: 16px;
`;

const Logo = styled.div`
  height: 48px;
  width: 48px;
`;

const Header = () => (
  <HeaderContainer>
    stuff
  </HeaderContainer>
);

export default Header;
