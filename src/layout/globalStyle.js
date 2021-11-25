import { createGlobalStyle } from 'styled-components';
import reset from 'styled-reset';
import MenloRegular from '../fonts/Menlo-Regular.ttf';
import MenloBold from '../fonts/Menlo-Bold.ttf';

const GlobalStyle = createGlobalStyle`
${reset}
@font-face {
  font-family: Menlo-Regular;
  src: local('Menlo-Regular'),
  url(${MenloRegular});
}
@font-face {
  font-family: Menlo-Bold;
  src: local('Menlo-Bold'),
  url(${MenloBold});
}
html, body, div, a, p, button, span, header, footer, section, nav, svg {
  box-sizing: border-box;
  transition: color 0.5s ease, background-color 0.5s ease, border-color 0.2s ease, transform 0.1s ease;
  -moz-transition: color 0.5s ease, background-color 0.5s ease, border-color 0.2s ease, transform 0.1s ease;
  -webkit-transition: color 0.5s ease, background-color 0.5s ease, border-color 0.2s ease, transform 0.1s ease;
  -o-transition: color 0.5s ease, background-color 0.5s ease, border-color 0.2s ease, transform 0.1s ease;
  font-family: Menlo, Menlo-Regular, Monaco, 'Courier New', monospace;
}
`;

export default GlobalStyle;
