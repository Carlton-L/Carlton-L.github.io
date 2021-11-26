import React from 'react';
import styled from 'styled-components';

import Social from './social';
import Email from './email';
import { email, socialLinks } from '../utils/config';

const Wrapper = styled.footer`
  // TODO: Make footer height a var
  height: 400px;
  width: 100%;
  position: fixed;
  bottom: 0;
  pointer-events: none;

  z-index: 0;
  
  display: flex;
  justify-content: center;
  overflow: hidden;
  `;

const Content = styled.div`
  display: none;
  max-width: 1200px;
  flex-grow: 1;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 0;

  @media (min-width: 834px) {
    display: flex;
  } 
`;

const Footer = () => {
  const variable = [];
  return (
    <Wrapper>
      <Content>
        <Social socialLinks={socialLinks} />
        <Email email={email} />
      </Content>
    </Wrapper>
  );
};

export default Footer;
