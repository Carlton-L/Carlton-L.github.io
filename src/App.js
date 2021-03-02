import React from 'react';
import './App.css';
import Background from './Background.jpeg';

const App = () => {
    return (
        <div
            style={{
                backgroundImage: `url(${Background})`,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0',
            }}
        >
            <h1>This page intentionally left blank.</h1>
        </div>
    );
};

export default App;
