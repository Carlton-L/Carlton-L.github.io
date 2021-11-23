import React from 'react';
import styled from 'styled-components';
import { color, border, variant } from 'styled-system';

const Button = styled.button`
  ${border}
  ${color}
  ${variant({
    variants: {
      normal: {
        padding: '12px 18px',
        borderWidth: '3px',
      },
      small: {
        padding: '6px, 8px',
        borderWidth: '0px',
      }
    }
  })}
  borderRadius: 10px;
  fontSize: 0.75rem;
`;

Button.defaultProps = {
  backgroundColor: 'paper',
  color: 'textPrimary',
  variant: 'normal',
  borderColor: 'primary',
};
