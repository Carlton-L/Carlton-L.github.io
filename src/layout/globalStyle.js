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
* {
  box-sizing: border-box
}
html, body {
  font-family: Menlo, Menlo-Regular, Monaco, 'Courier New', monospace;
}
`;

export default GlobalStyle;
