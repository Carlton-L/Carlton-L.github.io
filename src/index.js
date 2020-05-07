import React from 'react';
import ReactDOM from 'react-dom';

import ScrollingColorBackground from 'react-scrolling-color-background';
import App from './App';

ReactDOM.render(
    <React.StrictMode>
        <ScrollingColorBackground
            selector='.js-color-stop[data-background-color]'
            colorDataAttribute='data-background-color'
            initialRgb='rgb(81, 24, 69)'
        />
        <App />
    </React.StrictMode>,
    document.getElementById('root')
  );