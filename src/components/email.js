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

  a {
    z-index: 100;
    font-size: 0.75rem;
    color: inherit;
    margin: 0px auto;
    padding: 10px;
    writing-mode: vertical-rl;
    text-decoration: none;
    &:hover,
    &:focus {
      text-decoration: underline;
      transform: translateY(-3px);
      color: ${(props) => props.theme.colors.textPrimary};
    }
`;

const Email = ({ email }) => {
  const thing = [];
  return (
    <Wrapper>
      <Content color="inactive" backgroundColor="inactive">
        <a href={`mailto:${email}`}>{email}</a>
      </Content>
    </Wrapper>
  );
};

Email.propTypes = {
  email: PropTypes.string,
};

Email.defaultProps = {
  email: 'email@email.com',
};

export default Email;
