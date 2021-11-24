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
        padding: '6px 8px',
        borderWidth: '0px',
      }
    }
  })}
  border-radius: 10px;
  border-style: solid;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
  height: auto;
`;

Button.defaultProps = {
  backgroundColor: 'paper',
  color: 'textPrimary',
  variant: 'normal',
  borderColor: 'primary',
};

export default Button;
