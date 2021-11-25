import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { color } from 'styled-system';

const Wrapper = styled.div`
  ${color}
  width: 40px;

  z-index: 150;
  display: none;

  @media (min-width: 834px) {
    display: flex;
  }
`;

const Content = styled.div`
  ${color}
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  background-clip: text;

  &:after {
    // TODO: Make background-color a var tied to color of parent
    background-color: inherit;
    background-clip: border-box;
    content: '';
    display: block;
    width: 2px;
    height: 90px;
    margin: 0 auto;
  }
`;

const Icon = styled.a`
    color: inherit;
    padding: 10px;
    &:hover,
    &:focus {
      transform: translateY(-3px);
    }
    
    svg {
      color: inherit;
      width: 32px;
      height: 32px;

      path { fill: currentColor; }
  }

  &:last-of-type {
    margin-bottom: 20px;
  }
`;

const Social = ({ socialLinks }) => {
  const thing = [];
  return (
    <Wrapper>
      <Content color="inactive" backgroundColor="inactive">
        {
          socialLinks.map(({ name, url, icon }, i) => (
            <Icon href={url} aria-label={name} target="_blank" rel="noreferrer" key={i} dangerouslySetInnerHTML={{ __html: icon }} />
          ))
        }
      </Content>
    </Wrapper>
  );
};

Social.propTypes = {
  socialLinks: PropTypes.array,
};

Social.defaultProps = {
  socialLinks: [],
};

export default Social;
