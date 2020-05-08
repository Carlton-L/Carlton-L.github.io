import React from 'react';
import ReactDOM from 'react-dom';

import ScrollingColorBackground from 'react-scrolling-color-background';
import App from './App';

const scrollingStyles = {
    position: 'fixed',
    top: '0px',
    left: '0px',
    bottom: '0px',
    right: '0px',
    zIndex: '-1'
}

ReactDOM.render(
    <main>
        <App />
        <ScrollingColorBackground
            selector='.js-color-stop[data-background-color]'
            colorDataAttribute='data-background-color'
            initialRgb='rgb(81, 24, 69)'
            style={scrollingStyles}
        />
    </main>,
    document.getElementById('root')
  );