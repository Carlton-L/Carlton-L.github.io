import React from 'react';
import styled from 'styled-components';
import { color } from 'styled-system';

const Wrapper = styled.div`
  ${color}
`;

const Content = styled.div`
  max-width: 685px;
`;

/**
 * Guidelines:
 *
 * Color and background color must be settable by color prop or via inherit
 */
