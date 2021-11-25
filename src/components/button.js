import PropTypes from 'prop-types';
import styled from 'styled-components';
import { color, border, variant } from 'styled-system';

const Button = styled.button`
  ${border}
  ${color}
  ${variant({
    variants: {
      normal: {
        padding: '9px 15px',
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
  margin: 6px;
  text-decoration: none;

  &:hover {
    background-color: ${(props) => props.theme.colors.background};
  }
`;

Button.propTypes = {
  backgroundColor: PropTypes.string,
  color: PropTypes.string,
  variant: PropTypes.string,
  borderColor: PropTypes.string,
};

Button.defaultProps = {
  backgroundColor: 'paper',
  color: 'textPrimary',
  variant: 'normal',
  borderColor: 'primary',
};

export default Button;
